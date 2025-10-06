/**
 * MCP Authentication Module
 * Exports OAuth 2.0 authentication functionality
 */

export { MCPOAuthProvider, oauthProvider } from "./oauth-provider.js";
export type {
  MCPOAuthConfig,
  OAuthToken,
  OAuthTokenResponse,
  OAUTH_DISPLAY_MESSAGE_EVENT,
} from "./oauth-provider.js";

export { MCPOAuthTokenStorage, tokenStorage } from "./oauth-token-storage.js";
export type { OAuthCredentials } from "./oauth-token-storage.js";

export { OAuthUtils } from "./oauth-utils.js";
export type {
  OAuthAuthorizationServerMetadata,
  OAuthProtectedResourceMetadata,
} from "./oauth-utils.js";
