import { Request, Response, NextFunction } from 'express';
import OrgMemberModel from '../models/OrgMember';
import OrganizationModel from '../models/Organization';

// Extend Express Request to include org context
declare global {
  namespace Express {
    interface Request {
      orgId?: string;
      orgSlug?: string;
      orgMember?: {
        id: string;
        role: string;
        org_id: string;
      };
    }
  }
}

/**
 * Resolves org context from the URL slug parameter.
 * Validates that the authenticated user is a member of the org.
 * Must run AFTER authenticateJWT middleware.
 */
export function resolveOrgContext() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const orgSlug = req.params.orgSlug;
    if (!orgSlug) {
      res.status(400).json({ success: false, message: 'Organization slug is required' });
      return;
    }

    const userId = (req as any).user?.id || (req as any).userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const org = await OrganizationModel.findBySlug(orgSlug);
    if (!org) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    const membership = await OrgMemberModel.findByOrgAndUser(org.id, userId);
    if (!membership) {
      res.status(403).json({ success: false, message: 'Not a member of this organization' });
      return;
    }

    req.orgId = org.id;
    req.orgSlug = org.slug;
    req.orgMember = {
      id: membership.id,
      role: membership.role,
      org_id: org.id,
    };

    next();
  };
}

/**
 * Requires a minimum role level for the current org.
 * Role hierarchy: super_admin > org_admin > program_director > case_manager
 */
export function requireOrgRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.orgMember) {
      res.status(403).json({ success: false, message: 'Organization context required' });
      return;
    }
    if (!allowedRoles.includes(req.orgMember.role)) {
      res.status(403).json({ success: false, message: 'Insufficient role for this action' });
      return;
    }
    next();
  };
}
