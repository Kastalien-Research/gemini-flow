/**
 * OAuth Provider for MCP Protocol
 * Implements OAuth 2.0 authentication with PKCE for MCP servers
 * Adapted from gemini-cli for gemini-flow
 */

import * as http from "node:http";
import * as crypto from "node:crypto";
import { URL } from "node:url";
import type { EventEmitter } from "node:events";

export const OAUTH_DISPLAY_MESSAGE_EVENT = "oauth-display-message" as const;

export interface MCPOAuthConfig {
  enabled?: boolean;
  clientId?: string;
  clientSecret?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  audiences?: string[];
  redirectUri?: string;
  tokenParamName?: string;
  registrationUrl?: string;
}

export interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt?: number;
  refreshToken?: string;
  scope?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

const REDIRECT_PORT = 7777;
const REDIRECT_PATH = "/oauth/callback";
const HTTP_OK = 200;

/**
 * OAuth Provider for MCP authentication
 */
export class MCPOAuthProvider {
  /**
   * Generate PKCE parameters for OAuth flow
   */
  private generatePKCEParams(): PKCEParams {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    const state = crypto.randomBytes(16).toString("base64url");

    return { codeVerifier, codeChallenge, state };
  }

  /**
   * Start local callback server for OAuth
   */
  private async startCallbackServer(
    expectedState: string
  ): Promise<{ code: string; state: string }> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(
        async (req: http.IncomingMessage, res: http.ServerResponse) => {
          try {
            const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);

            if (url.pathname !== REDIRECT_PATH) {
              res.writeHead(404);
              res.end("Not found");
              return;
            }

            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state");
            const error = url.searchParams.get("error");

            if (error) {
              res.writeHead(HTTP_OK, { "Content-Type": "text/html" });
              res.end(`
                <html><body>
                  <h1>Authentication Failed</h1>
                  <p>Error: ${error}</p>
                  <p>You can close this window.</p>
                </body></html>
              `);
              server.close();
              reject(new Error(`OAuth error: ${error}`));
              return;
            }

            if (!code || !state || state !== expectedState) {
              res.writeHead(400);
              res.end("Invalid request");
              server.close();
              reject(new Error("Invalid OAuth callback"));
              return;
            }

            res.writeHead(HTTP_OK, { "Content-Type": "text/html" });
            res.end(`
              <html><body>
                <h1>Authentication Successful!</h1>
                <p>You can close this window.</p>
                <script>window.close();</script>
              </body></html>
            `);

            server.close();
            resolve({ code, state });
          } catch (error) {
            server.close();
            reject(error);
          }
        }
      );

      server.on("error", reject);
      server.listen(REDIRECT_PORT);

      setTimeout(() => {
        server.close();
        reject(new Error("OAuth callback timeout"));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Build authorization URL
   */
  private buildAuthorizationUrl(
    config: MCPOAuthConfig,
    pkceParams: PKCEParams
  ): string {
    const redirectUri =
      config.redirectUri || `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;

    const params = new URLSearchParams({
      client_id: config.clientId!,
      response_type: "code",
      redirect_uri: redirectUri,
      state: pkceParams.state,
      code_challenge: pkceParams.codeChallenge,
      code_challenge_method: "S256",
    });

    if (config.scopes && config.scopes.length > 0) {
      params.append("scope", config.scopes.join(" "));
    }

    if (config.audiences && config.audiences.length > 0) {
      params.append("audience", config.audiences.join(" "));
    }

    const url = new URL(config.authorizationUrl!);
    params.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForToken(
    config: MCPOAuthConfig,
    code: string,
    codeVerifier: string
  ): Promise<OAuthTokenResponse> {
    const redirectUri =
      config.redirectUri || `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: config.clientId!,
    });

    if (config.clientSecret) {
      params.append("client_secret", config.clientSecret);
    }

    const response = await fetch(config.tokenUrl!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    return (await response.json()) as OAuthTokenResponse;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    config: MCPOAuthConfig,
    refreshToken: string
  ): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId!,
    });

    if (config.clientSecret) {
      params.append("client_secret", config.clientSecret);
    }

    const response = await fetch(config.tokenUrl!, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    return (await response.json()) as OAuthTokenResponse;
  }

  /**
   * Perform OAuth authentication flow
   */
  async authenticate(
    serverName: string,
    config: MCPOAuthConfig,
    events?: EventEmitter
  ): Promise<OAuthToken> {
    if (!config.clientId || !config.authorizationUrl || !config.tokenUrl) {
      throw new Error("Missing required OAuth configuration");
    }

    const pkceParams = this.generatePKCEParams();
    const authUrl = this.buildAuthorizationUrl(config, pkceParams);

    // Display message to user
    const message = `→ Opening browser for OAuth sign-in...\n\nURL: ${authUrl}`;
    if (events) {
      events.emit(OAUTH_DISPLAY_MESSAGE_EVENT, message);
    } else {
      console.log(message);
    }

    // Start callback server
    const callbackPromise = this.startCallbackServer(pkceParams.state);

    // Open browser (implementation depends on platform)
    try {
      const open = await import("open");
      await open.default(authUrl);
    } catch (error) {
      console.warn("Could not open browser automatically");
    }

    // Wait for callback
    const { code } = await callbackPromise;

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForToken(
      config,
      code,
      pkceParams.codeVerifier
    );

    const token: OAuthToken = {
      accessToken: tokenResponse.access_token,
      tokenType: tokenResponse.token_type || "Bearer",
      refreshToken: tokenResponse.refresh_token,
      scope: tokenResponse.scope,
    };

    if (tokenResponse.expires_in) {
      token.expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    }

    return token;
  }
}

export const oauthProvider = new MCPOAuthProvider();
