import { Request, Response } from 'express';
import OrgMember from '../../models/OrgMember';
import Organization from '../../models/Organization';

const OrgController = {
  /**
   * GET /api/orgs/me — user's org memberships
   */
  async getMyOrgs(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      const orgs = await OrgMember.getUserOrgs(userId);
      return res.json({ success: true, data: orgs });
    } catch (err) {
      console.error('getMyOrgs error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * GET /api/orgs/:orgSlug/settings — org settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }
      return res.json({
        success: true,
        data: {
          name: org.name,
          email: org.settings?.email || null,
          phone: org.settings?.phone || null,
          address: org.settings?.address || null,
          city: org.settings?.city || null,
          state: org.settings?.state || null,
          zip: org.settings?.zip || null,
          plan_tier: org.plan_tier,
        },
      });
    } catch (err) {
      console.error('getSettings error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * PUT /api/orgs/:orgSlug/settings — update org settings
   */
  async updateSettings(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const { name, settings } = req.body;
      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (settings) updateData.settings = settings;

      const org = await Organization.update(orgId, updateData);
      return res.json({ success: true, data: org });
    } catch (err) {
      console.error('updateSettings error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * GET /api/orgs/:orgSlug/members — team members
   */
  async getMembers(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const members = await OrgMember.findByOrg(orgId);
      return res.json({ success: true, data: members });
    } catch (err) {
      console.error('getMembers error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};

export default OrgController;
