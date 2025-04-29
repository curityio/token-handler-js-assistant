/*
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {
  EndLoginRequest,
  LogoutResponse,
  OAuthAgentRemoteError,
  RefreshRequest,
  RefreshResponse,
  SessionResponse,
  StartLoginRequest,
  StartLoginResponse
} from "./types";

/**
 * The OAuth Agent Client configuration.
 */
export interface Configuration {
  /**
   * The base URL of the OAuth Agent which issues the SPA’s cookies. This must be in the same parent
   * site as the SPA’s web origin. The URL has the form `<host>/<app-anonymous-endpoint>/<token-handler-app-id>`.
   * If the SPA runs at https://www.example.com then the base URL could be one of the following values:
   * - `https://api.example.com/apps/oauth-agent1`
   * - `https://www.example.com/apps/oauth-agent1`
   */
  readonly oauthAgentBaseUrl: string;
}

/**
 * The main class that communicates with Token Handler's OAuth Agent.
 */
export class OAuthAgentClient {
  private readonly oauthAgentBaseUrl: string

  public constructor(config: Configuration) {
    this.oauthAgentBaseUrl = config.oauthAgentBaseUrl.endsWith('/') ? config.oauthAgentBaseUrl : `${config.oauthAgentBaseUrl}/`;
  }

  /**
   * Refreshes the access token. Calls the `/refresh` endpoint.
   * 
   * @param request the refresh request possibly containing extra parameters
   *
   * @return the refresh token response possibly containing the new access token's expiration time
   * 
   * @throws OAuthAgentRemoteError when OAuth Agent responded with an error
   */
  async refresh(request?: RefreshRequest): Promise<RefreshResponse> {
    const urlSearchParams = this.toUrlSearchParams(request?.extraRefreshParameters)
    const refreshResponse = await this.fetch("POST", "refresh", urlSearchParams)

    return {
      accessTokenExpiresIn: refreshResponse.access_token_expires_in
    }
  }

  /**
   * Returns the currently logged-in user's session data.
   * Calls the `/session` endpoint. A more generic {@link onPageLoad} can be used instead.
   *
   * @return the session response containing claims about currently logged-in user
   *
   * @throws OAuthAgentRemoteError when OAuth Agent responded with an error
   */
  async session(): Promise<SessionResponse> {
    const sessionResponse = await this.fetch("GET", "session");
    return {
      isLoggedIn: sessionResponse.is_logged_in as boolean,
      idTokenClaims: sessionResponse.id_token_claims,
      accessTokenExpiresIn: sessionResponse.access_token_expires_in
    }
  }

  /**
   * Starts the login. This function is supposed to be called when the user is supposed to log in.
   * Calls the `/login/start` endpoint. The `extraAuthorizationParameters` supplied in the
   * {@link StartLoginRequest} will be sent in the request. Note that any extra authorization
   * parameters have to allowed in the configuration of the token handler application in the Curity server.
   *
   * @param request the start login request possible containing extra parameters
   *
   * @return response containing the authorization URL that the SPA is supposed to redirect the user to.
   *
   * @throws OAuthAgentRemoteError when OAuth Agent responded with an error
   */
  async startLogin(request?: StartLoginRequest): Promise<StartLoginResponse> {
    const urlSearchParams = this.toUrlSearchParams(request?.extraAuthorizationParameters)
    const startLoginResponse = await this.fetch("POST", "login/start", urlSearchParams)
    return {
      authorizationUrl: startLoginResponse.authorization_url
    }
  }

  /**
   * Finishes the login. This function is supposed to be called when the authorization server
   * redirects to the SPA after the user has been authenticated. A more generic {@link onPageLoad} can be called instead.
   *
   * @param request the request object containing the current page's query string (with authorization response parameters)
   *
   * @return the response containing claims about currently logged-in user (same as calling the {@link session} function)
   *
   * @throws OAuthAgentRemoteError when OAuth Agent responded with an error
   */
  async endLogin(request: EndLoginRequest): Promise<SessionResponse> {
    const endLoginResponse = await this.fetch("POST", "login/end", request.searchParams)
    return {
      isLoggedIn: endLoginResponse.is_logged_in as boolean,
      idTokenClaims: endLoginResponse.id_token_claims,
      accessTokenExpiresIn: endLoginResponse.access_token_expires_in
    }
  }

  /**
   * Logouts the user (removes all token handler cookies). Calls to `/logout` endpoint.
   * If the logout is configured in the token handler application, then a logout URL is returned.
   * The SPA is required to redirect the user to that URL.
   *
   * @return response possibly containing the logout URL
   *
   * @throws OAuthAgentRemoteError when OAuth Agent responded with an error
   */
  async logout(): Promise<LogoutResponse> {
    const logoutResponse = await this.fetch("POST", "logout")
    const logoutUrl = logoutResponse.logout_url as string
    return { logoutUrl: logoutUrl }
  }

  /**
   * This function is supposed to be called when the SPA page is loaded. It either calls
   * the `/login/end` endpoint or the `/session` endpoint depending on whether the current page
   * query string contains authorization response parameters or not.
   *
   * @param pageUrl current page URL string
   *
   * @returns the response containing claims about currently logged-in user
   *
   * @throws OAuthAgentRemoteError when OAuth Agent responded with an error
   */
  async onPageLoad(pageUrl: string): Promise<SessionResponse> {
    const url = new URL(pageUrl)
    if (this.isOAuthResponse(url)) {
      return await this.endLogin({ searchParams: url.searchParams })
    } else {
      return await this.session()
    }
  }

  private isOAuthResponse(url: URL): boolean {
    const params = url.searchParams
    const isPlainOAuthResponse = params.has('state') && params.has('code')
    const isJarmOAuthResponse = params.has('response') && Array.from(params).length == 1
    const isErrorOAuthResponse = params.has('error') && params.has('state')

    return isPlainOAuthResponse || isJarmOAuthResponse || isErrorOAuthResponse

  }

  private toUrlSearchParams(data: { [key: string]: string; } | undefined): URLSearchParams {
    if (!data) {
      return new URLSearchParams()
    }
    return new URLSearchParams(data)
  }

  private async fetch(method: string, path: string, content?: URLSearchParams): Promise<any> {
    const headers = {
      accept: 'application/json',
      'token-handler-version': '1'
    } as Record<string, string>

    if (content && content.size !== 0) {
      headers["content-type"] = 'application/x-www-form-urlencoded'
    }

    const init = {
      credentials: "include",
      headers: headers,
      method: method,
      mode: "cors"
    } as RequestInit

    if (content != null) {
      init['body'] = content
    }
    const response = await window.fetch(`${this.oauthAgentBaseUrl}${path}`, init);
    if (response.ok) {
      return await response.json()
    }

    if (response.headers.get('content-type') == 'application/json') {
      const errorResponse = await response.json()
      throw new OAuthAgentRemoteError(response.status, errorResponse.error_code as string, errorResponse.detailed_error as string)
    } else {
      throw new OAuthAgentRemoteError(response.status, 'server_error', response.statusText)
    }
  }
}