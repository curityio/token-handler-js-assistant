# token-handler-js-assistant
A helper library to help SPAs interact with the OAuth Agent in the Token Handler pattern.

## Add to project
Add to your project using npm

```
npm install @curity/token-handler-js-assistant
```

## How to use in your project

Import the Assistant into your project and initialize it using `Configuration` object.
```typescript
import {OAuthAgentClient} from "@curity/token-handler-js-assistant";
const client = new OAuthAgentClient({oauthAgentBaseUrl: 'https://api.example.com/oauthagent/example'})
```
The `Configuration` object contains the following options:
- `oauthAgentBaseUrl` - a URL with path to the token handler application created in the Curity Identity Server (this URL ends with a token handler application ID
  as defined in the Curity Identity Server configuration).

### Using the initialized client

1. Starting the user login
   ```typescript
   const response = await this.oauthAgentClient.startLogin({
     extraAuthorizationParameters: {
       scope: "openid profile", 
       login_hint: "username",
       ui_locales: "en"
     }
   })
   location.href = response.authorizationUrl
   ```
2. Finishing the user login
   ```typescript
   const url = new URL(location.href)
   const response = await client.endLogin({ searchParams: url.searchParams })
   if (response.isLoggedIn) {
     // use id token claims to get username, e.g. response.idTokenClaims?.sub
   }
   ``` 
Note: The `endLogin` function should only be called with authorization response parameters (when the authorization
server redirected user to the SPA after a successful user login). It's recommended to call `onPageLoad()` instead
on every load of the SPA. This function makes a decision based the query string and either calls `endLogin()` or `session()`.

3. Handling page load
   ```typescript
   const sessionResponse = await client.onPageLoad(location.href)
   if (sessionResponse.isLoggedIn) {
     // user is logged in
   } else {
     const response = await client.startLogin()
     // redirect the user to the authorization server
     location.href = response.authorizationUrl
   }
   ```
4. Refreshing tokens
   ```typescript
   await client.refresh({
    extraRefreshParameters: {
      scope: 'openid'
    }
   })
   ```
5. Retrieving ID token claims
   ```typescript
   const sessionResponse = await client.session()
   // use session data
   if (session.isLoggedIn === true) {
     session.idTokenClaims?.sub
   }
   ```
6. Logging out
   ```typescript
   const logoutResponse = await client.logout()
   if (logoutResponse.logoutUrl) {
     // redirect user to the single logout url
     location.href = logoutResponse.logoutUrl;
   }
   ```
   
7. Implementing preemptive refresh. `session()`, `refresh()`, `endLogin()` and `onPageLoad()` functions return `accessTokenExpiresIn`
   if the Authorization Server includes `expires_in` in token responses. This field contains number of seconds until an  
   access token that is in the proxy cookie expires. This value can be used to preemptively refresh the access token.
   After calling `onPageLoad()` and `refresh()`:
   ```typescript
   // const response = await client.onPageLoad(location.href)
   // const response = await client.refresh()
   if (response.accessTokenExpiresIn != null) {
     const delay = Math.max(response.accessTokenExpiresIn - 2, 1)
     setTimeout(
       () => { client.refresh(); },
       delay * 1000
     );
   }
   ```
   Note: This is just a simplified example. The timeout has to be cleared properly (before every refresh, or before logout).

## Cookie Security

- `SameSite=Strict` cookies are sent to APIs, which cannot be sent from malicious sites
- to ensure that only precise whitelisted origins can send cookies to APIs, a `token-handler-version: 1` header is
  sent by this library on every request to the OAuth Agent. In cross-origin deployments this ensures that a CORS pre-flight
  request authorizes access. SPA developers may be required to send this header to token handler proxies as well (refer 
  to the token handler proxy documentation for details). 