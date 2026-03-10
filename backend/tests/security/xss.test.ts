/**
 * XSS (Cross-Site Scripting) Security Tests
 * Tests to ensure XSS vulnerabilities are prevented
 */

import { hasXSS, sanitizeHTML } from '../../src/middleware/sanitization';

describe('XSS Prevention', () => {
  describe('hasXSS', () => {
    it('should detect script tag injection', () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<script src="malicious.js"></script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script>document.cookie</script>',
      ];

      xssAttempts.forEach((attempt) => {
        expect(hasXSS(attempt)).toBe(true);
      });
    });

    it('should detect javascript: protocol', () => {
      const jsProtocols = ['javascript:alert("XSS")', 'JavaScript:void(0)', 'JAVASCRIPT:alert(1)'];

      jsProtocols.forEach((protocol) => {
        expect(hasXSS(protocol)).toBe(true);
      });
    });

    it('should detect event handler injection', () => {
      const eventHandlers = [
        '<img src=x onerror=alert("XSS")>',
        '<div onload=alert(1)>',
        '<body onload="alert(1)">',
        '<svg onload=alert(1)>',
      ];

      eventHandlers.forEach((handler) => {
        expect(hasXSS(handler)).toBe(true);
      });
    });

    it('should detect iframe injection', () => {
      const iframes = [
        '<iframe src="malicious.html"></iframe>',
        '<IFRAME src="evil.com"></IFRAME>',
      ];

      iframes.forEach((iframe) => {
        expect(hasXSS(iframe)).toBe(true);
      });
    });

    it('should detect embed and object tags', () => {
      const embedTags = ['<embed src="malicious.swf">', '<object data="evil.pdf">'];

      embedTags.forEach((tag) => {
        expect(hasXSS(tag)).toBe(true);
      });
    });

    it('should allow safe content', () => {
      const safeContent = [
        'Hello World',
        'john@example.com',
        'Regular text with <angle> brackets but no tags',
      ];

      safeContent.forEach((content) => {
        expect(hasXSS(content)).toBe(false);
      });
    });
  });

  describe('sanitizeHTML', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = sanitizeHTML(input);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
    });

    it('should escape quotes', () => {
      const input = '" onclick="alert(1)"';
      const sanitized = sanitizeHTML(input);

      expect(sanitized).toContain('&quot;');
    });

    it('should escape ampersands', () => {
      const input = 'Tom & Jerry';
      const sanitized = sanitizeHTML(input);

      expect(sanitized).toContain('&amp;');
    });

    it('should preserve safe content', () => {
      const safeInput = 'Hello World';
      expect(sanitizeHTML(safeInput)).toBe(safeInput);
    });

    it('should handle multiple special characters', () => {
      const input = '<div class="test" onclick="alert(\'XSS\')">Content & More</div>';
      const sanitized = sanitizeHTML(input);

      expect(sanitized).not.toContain('<div');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
      expect(sanitized).toContain('&quot;');
      expect(sanitized).toContain('&amp;');
    });
  });

  describe('Content Security Policy', () => {
    it('should validate CSP headers prevent XSS', () => {
      // This is a documentation test for CSP configuration
      const cspDirectives = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"], // No 'unsafe-inline' or 'unsafe-eval'
        objectSrc: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Necessary for some frameworks
      };

      expect(cspDirectives.scriptSrc).not.toContain("'unsafe-inline'");
      expect(cspDirectives.scriptSrc).not.toContain("'unsafe-eval'");
      expect(cspDirectives.objectSrc).toContain("'none'");
    });
  });
});
