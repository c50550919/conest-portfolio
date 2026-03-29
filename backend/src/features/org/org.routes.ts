import express from 'express';
import OrgController from './org.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { resolveOrgContext, requireOrgRole } from '../../middleware/orgContext';

const router = express.Router();

// User's org memberships (no org context needed)
router.get('/me', authenticateJWT, OrgController.getMyOrgs);

// Org-scoped routes
router.get(
  '/:orgSlug/settings',
  authenticateJWT,
  resolveOrgContext(),
  OrgController.getSettings,
);

router.put(
  '/:orgSlug/settings',
  authenticateJWT,
  resolveOrgContext(),
  requireOrgRole('org_admin', 'super_admin'),
  OrgController.updateSettings,
);

router.get(
  '/:orgSlug/members',
  authenticateJWT,
  resolveOrgContext(),
  OrgController.getMembers,
);

export default router;
