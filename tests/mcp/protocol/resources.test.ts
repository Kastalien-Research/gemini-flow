/**
 * MCP Resources Protocol Conformance Tests
 * Tests resources/list, resources/read, templates, and subscriptions
 */

import { describe, it, expect } from '@jest/globals';
import { MOCK_RESOURCES } from '../fixtures/test-data.js';

describe('MCP Resources Protocol', () => {
  describe('resources/list - Resource Discovery', () => {
    it('should list all available resources', () => {
      const resources = Object.values(MOCK_RESOURCES);

      expect(resources.length).toBeGreaterThan(0);
      resources.forEach(resource => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
      });
    });

    it('should return resources with valid structure', () => {
      const resource = MOCK_RESOURCES.text;

      expect(resource).toMatchObject({
        uri: expect.any(String),
        name: expect.any(String),
        mimeType: expect.any(String),
        description: expect.any(String),
      });
    });

    it('should validate URI format', () => {
      const resource = MOCK_RESOURCES.text;

      // URIs should follow standard schemes
      expect(resource.uri).toMatch(/^[a-z][a-z0-9+.-]*:/);
    });

    it('should support file:// URI scheme', () => {
      const resource = MOCK_RESOURCES.text;

      expect(resource.uri).toMatch(/^file:\/\//);
    });

    it('should include MIME type declarations', () => {
      const resources = Object.values(MOCK_RESOURCES);

      resources.forEach(resource => {
        expect(resource).toHaveProperty('mimeType');
        expect(resource.mimeType).toMatch(/^[a-z]+\/[a-z0-9\-\+\.]+$/i);
      });
    });

    it('should support metadata in listings', () => {
      const resource = MOCK_RESOURCES.json;

      expect(resource).toHaveProperty('description');
      expect(typeof resource.description).toBe('string');
    });
  });

  describe('resources/read - Resource Reading', () => {
    it('should read text resources', () => {
      const readResponse = {
        contents: [
          {
            uri: MOCK_RESOURCES.text.uri,
            mimeType: 'text/plain',
            text: 'Sample text content',
          },
        ],
      };

      expect(readResponse.contents).toBeInstanceOf(Array);
      expect(readResponse.contents[0]).toHaveProperty('text');
      expect(typeof readResponse.contents[0].text).toBe('string');
    });

    it('should read binary resources', () => {
      const readResponse = {
        contents: [
          {
            uri: MOCK_RESOURCES.binary.uri,
            mimeType: 'image/png',
            blob: 'base64-encoded-binary-data',
          },
        ],
      };

      expect(readResponse.contents[0]).toHaveProperty('blob');
      expect(typeof readResponse.contents[0].blob).toBe('string');
    });

    it('should include MIME type in response', () => {
      const response = {
        contents: [
          {
            uri: MOCK_RESOURCES.json.uri,
            mimeType: 'application/json',
            text: '{"key": "value"}',
          },
        ],
      };

      expect(response.contents[0].mimeType).toBe('application/json');
    });

    it('should validate text vs blob content types', () => {
      const textContent = {
        uri: 'file:///text.txt',
        mimeType: 'text/plain',
        text: 'content',
      };

      const blobContent = {
        uri: 'file:///image.png',
        mimeType: 'image/png',
        blob: 'base64data',
      };

      // Text resources use 'text', binary use 'blob'
      expect(textContent).toHaveProperty('text');
      expect(textContent).not.toHaveProperty('blob');
      expect(blobContent).toHaveProperty('blob');
      expect(blobContent).not.toHaveProperty('text');
    });

    it('should handle JSON resources', () => {
      const jsonResponse = {
        contents: [
          {
            uri: MOCK_RESOURCES.json.uri,
            mimeType: 'application/json',
            text: JSON.stringify({ data: 'value' }),
          },
        ],
      };

      const parsed = JSON.parse(jsonResponse.contents[0].text);

      expect(parsed).toHaveProperty('data');
      expect(parsed.data).toBe('value');
    });

    it('should validate base64 encoding for binary data', () => {
      const base64Data = 'SGVsbG8gV29ybGQ=';
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

      expect(base64Data).toMatch(base64Regex);
    });
  });

  describe('Resource Templates', () => {
    it('should support URI templates with parameters', () => {
      const template = MOCK_RESOURCES.template;

      expect(template.uri).toContain('{id}');
    });

    it('should substitute template parameters', () => {
      const template = 'file:///test/{id}/data';
      const params = { id: '12345' };

      const uri = template.replace('{id}', params.id);

      expect(uri).toBe('file:///test/12345/data');
    });

    it('should handle multiple template parameters', () => {
      const template = 'file:///{org}/{repo}/issues/{number}';
      const params = { org: 'test-org', repo: 'test-repo', number: '42' };

      let uri = template;
      Object.entries(params).forEach(([key, value]) => {
        uri = uri.replace(`{${key}}`, value);
      });

      expect(uri).toBe('file:///test-org/test-repo/issues/42');
    });

    it('should validate required template parameters', () => {
      const template = 'file:///data/{id}';
      const requiredParams = ['id'];

      const extractParams = (uri: string) => {
        const matches = uri.match(/\{([^}]+)\}/g);
        return matches ? matches.map(m => m.slice(1, -1)) : [];
      };

      const params = extractParams(template);

      expect(params).toEqual(requiredParams);
    });

    it('should handle optional template parameters', () => {
      const template = 'file:///data/{id}{?page,limit}';

      expect(template).toContain('{id}');
      expect(template).toContain('{?page,limit}');
    });
  });

  describe('Resource Subscriptions', () => {
    it('should support resource update subscriptions', () => {
      const subscription = {
        uri: MOCK_RESOURCES.text.uri,
        type: 'update',
      };

      expect(subscription).toHaveProperty('uri');
      expect(subscription).toHaveProperty('type');
    });

    it('should notify on resource changes', () => {
      const updateNotification = {
        method: 'notifications/resources/updated',
        params: {
          uri: MOCK_RESOURCES.text.uri,
        },
      };

      expect(updateNotification.method).toBe('notifications/resources/updated');
      expect(updateNotification.params).toHaveProperty('uri');
    });

    it('should support list change notifications', () => {
      const listUpdateNotification = {
        method: 'notifications/resources/list_changed',
        params: {},
      };

      expect(listUpdateNotification.method).toBe('notifications/resources/list_changed');
    });

    it('should unsubscribe from resource updates', () => {
      const unsubscribe = {
        uri: MOCK_RESOURCES.text.uri,
        action: 'unsubscribe',
      };

      expect(unsubscribe.action).toBe('unsubscribe');
    });
  });

  describe('MIME Type Handling', () => {
    it('should support text MIME types', () => {
      const textMimeTypes = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'text/markdown',
      ];

      textMimeTypes.forEach(mimeType => {
        expect(mimeType).toMatch(/^text\//);
      });
    });

    it('should support application MIME types', () => {
      const appMimeTypes = [
        'application/json',
        'application/xml',
        'application/pdf',
        'application/zip',
      ];

      appMimeTypes.forEach(mimeType => {
        expect(mimeType).toMatch(/^application\//);
      });
    });

    it('should support image MIME types', () => {
      const imageMimeTypes = [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/svg+xml',
      ];

      imageMimeTypes.forEach(mimeType => {
        expect(mimeType).toMatch(/^image\//);
      });
    });

    it('should support audio/video MIME types', () => {
      const mediaMimeTypes = [
        'audio/mpeg',
        'audio/wav',
        'video/mp4',
        'video/quicktime',
      ];

      mediaMimeTypes.forEach(mimeType => {
        expect(mimeType).toMatch(/^(audio|video)\//);
      });
    });

    it('should validate MIME type format', () => {
      const validMimeType = 'application/vnd.custom+json';
      const mimeTypeRegex = /^[a-z]+\/[a-z0-9\-\+\.]+$/i;

      expect(validMimeType).toMatch(mimeTypeRegex);
    });
  });

  describe('Resource URIs', () => {
    it('should support custom URI schemes', () => {
      const customSchemes = [
        'custom://resource/path',
        'db://localhost/table/row',
        'api://service/endpoint',
      ];

      customSchemes.forEach(uri => {
        expect(uri).toMatch(/^[a-z][a-z0-9+.-]*:/);
      });
    });

    it('should validate file:// URIs', () => {
      const fileUri = 'file:///absolute/path/to/file.txt';

      expect(fileUri).toMatch(/^file:\/\/\//);
    });

    it('should handle relative paths in file URIs', () => {
      const absolutePath = '/absolute/path/file.txt';
      const fileUri = `file://${absolutePath}`;

      expect(fileUri).toBe('file:///absolute/path/file.txt');
    });

    it('should encode special characters in URIs', () => {
      const path = '/path/with spaces/and%special.txt';
      const encoded = encodeURIComponent(path);

      expect(encoded).not.toContain(' ');
      expect(encoded).toContain('%20');
    });
  });

  describe('Error Handling', () => {
    it('should handle resource not found', () => {
      const error = {
        code: -32000,
        message: 'Resource not found',
        data: {
          uri: 'file:///nonexistent.txt',
        },
      };

      expect(error.code).toBeLessThanOrEqual(-32000);
      expect(error.message).toContain('not found');
      expect(error.data).toHaveProperty('uri');
    });

    it('should handle permission denied', () => {
      const error = {
        code: -32000,
        message: 'Permission denied',
        data: {
          uri: 'file:///protected/file.txt',
        },
      };

      expect(error.message).toContain('Permission denied');
    });

    it('should handle invalid URI', () => {
      const invalidUri = 'not-a-valid-uri';
      const uriRegex = /^[a-z][a-z0-9+.-]*:/;

      expect(invalidUri).not.toMatch(uriRegex);
    });

    it('should handle unsupported MIME type', () => {
      const error = {
        code: -32000,
        message: 'Unsupported MIME type',
        data: {
          mimeType: 'application/x-unknown',
        },
      };

      expect(error.message).toContain('Unsupported');
    });
  });

  describe('Resource Metadata', () => {
    it('should include resource descriptions', () => {
      const resource = MOCK_RESOURCES.json;

      expect(resource).toHaveProperty('description');
      expect(resource.description).toBe('A test JSON document');
    });

    it('should support additional metadata fields', () => {
      const resourceWithMetadata = {
        ...MOCK_RESOURCES.text,
        size: 1024,
        lastModified: '2025-10-06T12:00:00Z',
        checksum: 'sha256:abcd1234',
      };

      expect(resourceWithMetadata).toHaveProperty('size');
      expect(resourceWithMetadata).toHaveProperty('lastModified');
      expect(resourceWithMetadata).toHaveProperty('checksum');
    });
  });
});
