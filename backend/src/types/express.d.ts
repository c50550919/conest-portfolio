/**
 * Express type extensions
 * Adds custom properties to Express Request interface
 */

declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      email: string;
      role?: string;
      [key: string]: any;
    };
  }
}
