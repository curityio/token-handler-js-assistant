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

/**
 * Passed to {@link OAuthAgentClient#startLogin} function. The SPA can pass extra authorization parameters
 * (such as `scope`, `login_hint` or `ui_locales`). These parameters will be used in the authorization request.
 * Each parameter has to be explicitly allowed in the configuration of the token handler application
 * in the Curity server.
 */
export interface StartLoginRequest {
  readonly extraAuthorizationParameters?: { [key: string]: string };
}

/**
 * Returned from {@link OAuthAgentClient#startLogin} function. Contains the `authorizationUrl` that the SPA
 * is supposed to redirect the user to.
 */
export interface StartLoginResponse {
  readonly authorizationUrl: string;
}

/**
 * Passed to {@link OAuthAgentClient#endLogin} function. The SPA is supposed to pass
 * the {@link URLSearchParams} of the current page URL into this request.
 */
export interface EndLoginRequest {
  readonly searchParams: URLSearchParams;
}

/**
 * Returned from {@link OAuthAgentClient#session}, {@link OAuthAgentClient#endLogin} and
 * {@link OAuthAgentClient#onPageLoad} functions. Contains:
 * - `isLoggedIn` - a boolean flag indicationg whether a user is logged in
 * - `idTokenClaims` - an object containing ID token claims. This will be `null` if the user is
 *                     logged out; or the user is logged in but no ID token was issued.
 * - `accessTokenExpiresIn` - expiration time of access token in seconds (`null` if no `expires_in` parameter
 *                            was returned from the Authorization Server's token endpoint)
 */
export interface SessionResponse {
  readonly isLoggedIn: boolean;
  readonly idTokenClaims?: any;
  readonly accessTokenExpiresIn?: number;
}

/**
 * Passed to {@link OAuthAgentClient#refresh} function.
 */
export interface RefreshRequest {
  /**
   * Extra parameters to be used in the token refresh request.
   * Each parameter has to be explicitly allowed in the configuration of the token handler application
   * in the Curity server.
   */
  readonly extraRefreshParameters?: { [key: string]: string };
}

/**
 * Returned from the {@link OAuthAgentClient#refresh} function. Contains:
 * - `accessTokenExpiresIn` - expiration time of access token in seconds (`null` if no `expires_in` parameter
 *                            was returned from the Authorization Server's token endpoint)
 */
export interface RefreshResponse {
  readonly accessTokenExpiresIn?: number;
}

/**
 * Returned from {@link OAuthAgentClient#logout} function. Contains the `logoutUrl` (if logout is enabled in
 * the configuration of the token handler application in the Curity server). The SPA is
 * supposed to redirect the user to the returned logout URL.
 */
export interface LogoutResponse {
  readonly logoutUrl?: string;
}

/**
 * This error is thrown from all the {@link OAuthAgentClient} functions in case a call to the
 * token handler application failed.
 */
export class OAuthAgentRemoteError extends Error {
  /**
   *
   * @param status the HTTP status from the server
   * @param code the error code
   * @param details the detailed error message (available only when exposing detailed
   *                error messages is enabled in the Curity server)
   */
  constructor(readonly status: number, readonly code: string, readonly details?: string) {
    super(`${status}: ${code}`)
  }
}