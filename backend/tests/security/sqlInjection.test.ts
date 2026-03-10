/**
 * SQL Injection Security Tests
 * Tests to ensure SQL injection vulnerabilities are prevented
 */

import { hasSQLInjection, sanitizeSQL } from '../../src/middleware/sanitization';

describe('SQL Injection Prevention', () => {
  describe('hasSQLInjection', () => {
    it('should detect basic SQL injection patterns', () => {
      const injectionAttempts = [
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
        "1' UNION SELECT * FROM users--",
        "admin'--",
        "' OR '1'='1",
        '1; DELETE FROM users',
      ];

      injectionAttempts.forEach((attempt) => {
        expect(hasSQLInjection(attempt)).toBe(true);
      });
    });

    it('should detect SQL keywords in injection attempts', () => {
      const injectionAttempts = [
        'SELECT * FROM users',
        'INSERT INTO users VALUES',
        'UPDATE users SET',
        'DELETE FROM users',
        'DROP TABLE users',
        'EXEC sp_executesql',
      ];

      injectionAttempts.forEach((attempt) => {
        expect(hasSQLInjection(attempt)).toBe(true);
      });
    });

    it('should allow safe input without SQL patterns', () => {
      const safeInputs = ['john@example.com', 'John Doe', 'My address is 123 Main St', '555-1234'];

      safeInputs.forEach((input) => {
        expect(hasSQLInjection(input)).toBe(false);
      });
    });

    it('should detect comment-based injection', () => {
      const commentInjections = ['admin/*comment*/', 'test--comment', 'user/**/OR/**/1=1'];

      commentInjections.forEach((injection) => {
        expect(hasSQLInjection(injection)).toBe(true);
      });
    });
  });

  describe('sanitizeSQL', () => {
    it('should remove SQL comment markers', () => {
      expect(sanitizeSQL('test--comment')).not.toContain('--');
      expect(sanitizeSQL('test/*comment*/')).not.toContain('/*');
      expect(sanitizeSQL('test/*comment*/')).not.toContain('*/');
    });

    it('should remove trailing semicolons', () => {
      expect(sanitizeSQL('test;')).toBe('test');
      expect(sanitizeSQL('test; ')).toBe('test');
      expect(sanitizeSQL('test;  ')).toBe('test');
    });

    it('should preserve safe content', () => {
      const safeInput = 'john@example.com';
      expect(sanitizeSQL(safeInput)).toBe(safeInput);
    });

    it('should handle multiple sanitization needs', () => {
      const dangerous = 'test--comment; /*injection*/';
      const sanitized = sanitizeSQL(dangerous);

      expect(sanitized).not.toContain('--');
      expect(sanitized).not.toContain('/*');
      expect(sanitized).not.toContain('*/');
      expect(sanitized).not.toMatch(/;\s*$/);
    });
  });

  describe('Parameterized Query Protection', () => {
    it('should demonstrate safe parameterized query usage', () => {
      // This is a documentation test showing how to use parameterized queries
      const unsafeQuery = `SELECT * FROM users WHERE email = '${userInput}'`;
      const safeQuery = 'SELECT * FROM users WHERE email = ?';
      const userInput = "test' OR '1'='1";

      // The safe query with parameters prevents injection
      expect(safeQuery).not.toContain(userInput);
    });
  });
});
