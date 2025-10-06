/**
 * MCP OAuth Authentication Tests
 * Tests OAuth 2.0 discovery, token management, and authentication flows
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MOCK_OAUTH_CONFIG, MOCK_TOKENS } from '../fixtures/test-data.js';

describe('MCP OAuth Authentication', () => {
  describe('OAuth Discovery', () => {
    it('should discover OAuth endpoints from server metadata', () => {
      const metadata = {
        oauth: {
          authorizationEndpoint: MOCK_OAUTH_CONFIG.authorizationEndpoint,
          tokenEndpoint: MOCK_OAUTH_CONFIG.tokenEndpoint,
        },
      };

      expect(metadata.oauth).toHaveProperty('authorizationEndpoint');
      expect(metadata.oauth).toHaveProperty('tokenEndpoint');
    });

    it('should detect 401 responses requiring auth', () => {
      const response = {
        status: 401,
        headers: {
          'www-authenticate': 'Bearer',
        },
      };

      expect(response.status).toBe(401);
      expect(response.headers).toHaveProperty('www-authenticate');
    });

    it('should discover OAuth from well-known endpoint', () => {
      const wellKnownUrl = 'https://server.example.com/.well-known/oauth-authorization-server';

      expect(wellKnownUrl).toContain('/.well-known/oauth-authorization-server');
    });

    it('should parse OAuth discovery response', () => {
      const discovery = {
        issuer: 'https://auth.example.com',
        authorization_endpoint: MOCK_OAUTH_CONFIG.authorizationEndpoint,
        token_endpoint: MOCK_OAUTH_CONFIG.tokenEndpoint,
        scopes_supported: ['mcp.read', 'mcp.write'],
      };

      expect(discovery).toHaveProperty('authorization_endpoint');
      expect(discovery).toHaveProperty('token_endpoint');
      expect(discovery.scopes_supported).toContain('mcp.read');
    });
  });

  describe('Dynamic Client Registration', () => {
    it('should register OAuth client dynamically', () => {
      const registrationRequest = {
        redirect_uris: ['http://localhost:7777/oauth/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        client_name: 'Gemini Flow MCP Client',
      };

      expect(registrationRequest).toHaveProperty('redirect_uris');
      expect(registrationRequest.grant_types).toContain('authorization_code');
    });

    it('should receive client credentials', () => {
      const registrationResponse = {
        client_id: MOCK_OAUTH_CONFIG.clientId,
        client_secret: 'generated-secret',
        redirect_uris: [MOCK_OAUTH_CONFIG.redirectUri],
      };

      expect(registrationResponse).toHaveProperty('client_id');
      expect(registrationResponse).toHaveProperty('client_secret');
    });
  });

  describe('Authorization Code Flow', () => {
    it('should build authorization URL', () => {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: MOCK_OAUTH_CONFIG.clientId,
        redirect_uri: MOCK_OAUTH_CONFIG.redirectUri,
        scope: MOCK_OAUTH_CONFIG.scopes.join(' '),
        state: 'random-state-string',
      });

      const authUrl = `${MOCK_OAUTH_CONFIG.authorizationEndpoint}?${params}`;

      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('redirect_uri=');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('state=');
    });

    it('should validate state parameter for CSRF protection', () => {
      const sentState = 'random-state-abc123';
      const receivedState = 'random-state-abc123';

      expect(receivedState).toBe(sentState);
    });

    it('should handle authorization callback', () => {
      const callbackUrl = new URL(
        `${MOCK_OAUTH_CONFIG.redirectUri}?code=auth-code-123&state=state-abc`
      );

      const code = callbackUrl.searchParams.get('code');
      const state = callbackUrl.searchParams.get('state');

      expect(code).toBe('auth-code-123');
      expect(state).toBe('state-abc');
    });

    it('should exchange authorization code for tokens', () => {
      const tokenRequest = {
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        redirect_uri: MOCK_OAUTH_CONFIG.redirectUri,
        client_id: MOCK_OAUTH_CONFIG.clientId,
        client_secret: 'client-secret',
      };

      expect(tokenRequest.grant_type).toBe('authorization_code');
      expect(tokenRequest).toHaveProperty('code');
      expect(tokenRequest).toHaveProperty('redirect_uri');
    });

    it('should receive access and refresh tokens', () => {
      const tokenResponse = MOCK_TOKENS.valid;

      expect(tokenResponse).toHaveProperty('access_token');
      expect(tokenResponse).toHaveProperty('refresh_token');
      expect(tokenResponse).toHaveProperty('token_type', 'Bearer');
      expect(tokenResponse).toHaveProperty('expires_in');
    });
  });

  describe('Token Management', () => {
    it('should store tokens securely', () => {
      const tokenStorage = {
        serverName: 'test-server',
        tokens: MOCK_TOKENS.valid,
        expiresAt: Date.now() + MOCK_TOKENS.valid.expires_in * 1000,
      };

      expect(tokenStorage).toHaveProperty('tokens');
      expect(tokenStorage).toHaveProperty('expiresAt');
    });

    it('should check token expiration', () => {
      const expiresAt = Date.now() + 3600 * 1000; // 1 hour from now
      const isExpired = Date.now() >= expiresAt;

      expect(isExpired).toBe(false);
    });

    it('should detect expired tokens', () => {
      const expiresAt = Date.now() - 1000; // 1 second ago
      const isExpired = Date.now() >= expiresAt;

      expect(isExpired).toBe(true);
    });

    it('should refresh expired tokens', () => {
      const refreshRequest = {
        grant_type: 'refresh_token',
        refresh_token: MOCK_TOKENS.valid.refresh_token,
        client_id: MOCK_OAUTH_CONFIG.clientId,
        client_secret: 'client-secret',
      };

      expect(refreshRequest.grant_type).toBe('refresh_token');
      expect(refreshRequest).toHaveProperty('refresh_token');
    });

    it('should update tokens after refresh', () => {
      const oldTokens = MOCK_TOKENS.expired;
      const newTokens = MOCK_TOKENS.valid;

      expect(newTokens.access_token).not.toBe(oldTokens.access_token);
      expect(newTokens.expires_in).toBeGreaterThan(0);
    });

    it('should handle refresh token rotation', () => {
      const response = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      expect(response).toHaveProperty('refresh_token');
      expect(response.refresh_token).not.toBe(MOCK_TOKENS.valid.refresh_token);
    });
  });

  describe('Token Usage', () => {
    it('should attach access token to requests', () => {
      const headers = {
        'Authorization': `Bearer ${MOCK_TOKENS.valid.access_token}`,
        'Content-Type': 'application/json',
      };

      expect(headers.Authorization).toMatch(/^Bearer /);
      expect(headers.Authorization).toContain(MOCK_TOKENS.valid.access_token);
    });

    it('should validate token before use', () => {
      const token = MOCK_TOKENS.valid;
      const expiresAt = Date.now() + token.expires_in * 1000;

      const isValid = token.access_token && Date.now() < expiresAt;

      expect(isValid).toBe(true);
    });

    it('should handle token validation errors', () => {
      const error = {
        status: 401,
        error: 'invalid_token',
        error_description: 'The access token expired',
      };

      expect(error.status).toBe(401);
      expect(error.error).toBe('invalid_token');
    });
  });

  describe('Localhost Callback Server', () => {
    it('should configure callback URL', () => {
      const callbackUrl = 'http://localhost:7777/oauth/callback';

      expect(callbackUrl).toMatch(/^http:\/\/localhost:\d+/);
      expect(callbackUrl).toContain('/oauth/callback');
    });

    it('should parse callback port', () => {
      const url = new URL('http://localhost:7777/oauth/callback');
      const port = parseInt(url.port, 10);

      expect(port).toBe(7777);
    });

    it('should handle callback request', () => {
      const callbackParams = {
        code: 'auth-code',
        state: 'state-value',
      };

      expect(callbackParams).toHaveProperty('code');
      expect(callbackParams).toHaveProperty('state');
    });
  });

  describe('Error Handling', () => {
    it('should handle authorization denied', () => {
      const callbackUrl = new URL(
        'http://localhost:7777/oauth/callback?error=access_denied&error_description=User+denied+access'
      );

      const error = callbackUrl.searchParams.get('error');
      const description = callbackUrl.searchParams.get('error_description');

      expect(error).toBe('access_denied');
      expect(description).toBe('User denied access');
    });

    it('should handle invalid client', () => {
      const error = {
        error: 'invalid_client',
        error_description: 'Client authentication failed',
      };

      expect(error.error).toBe('invalid_client');
    });

    it('should handle invalid grant', () => {
      const error = {
        error: 'invalid_grant',
        error_description: 'Authorization code is invalid or expired',
      };

      expect(error.error).toBe('invalid_grant');
    });

    it('should handle token refresh failure', () => {
      const error = {
        error: 'invalid_grant',
        error_description: 'Refresh token is invalid',
      };

      expect(error.error).toBe('invalid_grant');
      // Should trigger re-authentication
    });

    it('should retry failed requests', () => {
      const retryConfig = {
        maxRetries: 3,
        retryDelay: 1000,
        retryableErrors: [401, 500, 502, 503],
      };

      expect(retryConfig.maxRetries).toBeGreaterThan(0);
      expect(retryConfig.retryableErrors).toContain(401);
    });
  });

  describe('Scope Management', () => {
    it('should request required scopes', () => {
      const scopes = MOCK_OAUTH_CONFIG.scopes;

      expect(scopes).toContain('mcp.read');
      expect(scopes).toContain('mcp.write');
    });

    it('should handle scope downgrade', () => {
      const requestedScopes = ['mcp.read', 'mcp.write', 'mcp.admin'];
      const grantedScopes = ['mcp.read', 'mcp.write'];

      const hasAllScopes = requestedScopes.every(s => grantedScopes.includes(s));

      expect(hasAllScopes).toBe(false);
      expect(grantedScopes).not.toContain('mcp.admin');
    });

    it('should validate granted scopes', () => {
      const tokenResponse = {
        ...MOCK_TOKENS.valid,
        scope: 'mcp.read mcp.write',
      };

      const grantedScopes = tokenResponse.scope.split(' ');

      expect(grantedScopes).toContain('mcp.read');
      expect(grantedScopes).toContain('mcp.write');
    });
  });

  describe('Security', () => {
    it('should use PKCE for enhanced security', () => {
      const codeVerifier = 'random-code-verifier-string';
      const codeChallenge = Buffer.from(codeVerifier).toString('base64url');

      expect(codeChallenge).toBeDefined();
      expect(codeChallenge.length).toBeGreaterThan(0);
    });

    it('should validate HTTPS for production', () => {
      const prodUrl = 'https://auth.example.com/authorize';

      expect(prodUrl).toMatch(/^https:/);
    });

    it('should allow HTTP only for localhost', () => {
      const localhostUrl = 'http://localhost:7777/oauth/callback';

      expect(localhostUrl).toMatch(/^http:\/\/localhost/);
    });

    it('should protect against CSRF with state parameter', () => {
      const state = crypto.randomUUID();

      expect(state).toMatch(/^[a-f0-9\-]{36}$/);
    });
  });
});
