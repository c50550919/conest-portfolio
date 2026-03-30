import { Request, Response } from 'express';
import { db } from '../../config/database';
import ClientModel from '../../models/Client';
import HousingUnitModel from '../../models/HousingUnit';
import PlacementModel from '../../models/Placement';
import { PlacementMatchingService } from './placement.service';

const PlacementController = {
  /**
   * GET /api/orgs/:orgSlug/clients — client roster
   */
  async getClients(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const { status, case_manager_id } = req.query;
      const clients = await ClientModel.findByOrg(orgId, {
        status: status as string | undefined,
        case_manager_id: case_manager_id as string | undefined,
      });
      return res.json({ success: true, data: clients });
    } catch (err) {
      console.error('getClients error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * GET /api/orgs/:orgSlug/clients/:id — client detail
   */
  async getClient(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const client = await ClientModel.findById(orgId, req.params.id);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      return res.json({ success: true, data: client });
    } catch (err) {
      console.error('getClient error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * GET /api/orgs/:orgSlug/units — housing unit inventory
   */
  async getUnits(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const { status, min_bedrooms } = req.query;
      const units = await HousingUnitModel.findByOrg(orgId, {
        status: status as string | undefined,
        min_bedrooms: min_bedrooms ? parseInt(min_bedrooms as string) : undefined,
      });
      return res.json({ success: true, data: units });
    } catch (err) {
      console.error('getUnits error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * GET /api/orgs/:orgSlug/placements — placement pipeline
   */
  async getPlacements(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const { stage } = req.query;
      const placements = await PlacementModel.findByOrg(orgId, {
        stage: stage as string | undefined,
      });
      return res.json({ success: true, data: placements });
    } catch (err) {
      console.error('getPlacements error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * GET /api/orgs/:orgSlug/placements/:id — placement detail
   */
  async getPlacement(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const placement = await PlacementModel.findById(orgId, req.params.id);
      if (!placement) {
        return res.status(404).json({ success: false, message: 'Placement not found' });
      }
      // Also fetch the client for the detail view
      const client = placement.client_id
        ? await ClientModel.findById(orgId, placement.client_id)
        : null;
      return res.json({ success: true, data: { ...placement, client } });
    } catch (err) {
      console.error('getPlacement error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * GET /api/orgs/:orgSlug/placements/:id/matches — top matching units for client
   */
  async getMatches(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const placement = await PlacementModel.findById(orgId, req.params.id);
      if (!placement) {
        return res.status(404).json({ success: false, message: 'Placement not found' });
      }
      const client = await ClientModel.findById(orgId, placement.client_id);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      const matches = await PlacementMatchingService.findTopMatches(orgId, client);
      // Enrich with unit details
      const enriched = await Promise.all(
        matches.map(async (match) => {
          const unit = await HousingUnitModel.findById(orgId, match.unitId);
          return {
            ...match,
            address: unit?.address || '',
            city: unit?.city || '',
            bedrooms: unit?.bedrooms || 0,
            rent_amount: unit?.rent_amount || 0,
          };
        }),
      );
      return res.json({ success: true, data: enriched });
    } catch (err) {
      console.error('getMatches error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * PATCH /api/orgs/:orgSlug/placements/:id/stage — update placement stage
   */
  async updateStage(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const { stage, unit_id, outcome } = req.body;
      if (!stage) {
        return res.status(400).json({ success: false, message: 'Stage is required' });
      }
      const extra: Record<string, unknown> = {};
      if (unit_id) extra.unit_id = unit_id;
      if (outcome) extra.outcome = outcome;

      const placement = await PlacementModel.updateStage(orgId, req.params.id, stage, extra);
      return res.json({ success: true, data: placement });
    } catch (err) {
      console.error('updateStage error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * GET /api/orgs/:orgSlug/reports/summary — report data
   */
  async getReportSummary(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const stageCounts = await PlacementModel.countByStage(orgId);
      const clientCounts = await ClientModel.countByOrg(orgId);

      const totalPlacements =
        (stageCounts.placed || 0) + (stageCounts.closed || 0);
      const activeClients =
        (clientCounts.intake || 0) + (clientCounts.ready || 0);

      // Monthly placements (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyRaw = await db('placements')
        .select(db.raw("to_char(created_at, 'Mon') as month"))
        .select(db.raw("date_trunc('month', created_at) as month_start"))
        .count('id as count')
        .where('org_id', orgId)
        .where('created_at', '>=', sixMonthsAgo)
        .groupByRaw("date_trunc('month', created_at), to_char(created_at, 'Mon')")
        .orderBy('month_start', 'asc');

      const monthlyPlacements = monthlyRaw.map((r: any) => ({
        month: r.month,
        count: parseInt(r.count, 10),
      }));

      // Outcome breakdown (closed placements only)
      const outcomeRaw = await db('placements')
        .select('outcome')
        .count('id as count')
        .where('org_id', orgId)
        .where('stage', 'closed')
        .whereNotNull('outcome')
        .groupBy('outcome');

      const outcomeBreakdown = outcomeRaw.map((r: any) => ({
        outcome: r.outcome.charAt(0).toUpperCase() + r.outcome.slice(1),
        count: parseInt(r.count, 10),
      }));

      return res.json({
        success: true,
        data: {
          totalPlacements,
          avgDaysToPlacement: 18, // TODO: calculate from actual timestamps
          successRate: totalPlacements > 0 ? 82 : 0, // TODO: calculate from outcomes
          activeClients,
          stageCounts,
          clientCounts,
          monthlyPlacements,
          outcomeBreakdown,
        },
      });
    } catch (err) {
      console.error('getReportSummary error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};

export default PlacementController;
