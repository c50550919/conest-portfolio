import { Request, Response } from 'express';
import { db } from '../../config/database';
import ClientModel from '../../models/Client';
import HousingUnitModel from '../../models/HousingUnit';
import PlacementModel from '../../models/Placement';
import ActivityEventModel from '../../models/ActivityEvent';
import TaskModel from '../../models/Task';
import { PlacementMatchingService } from './placement.service';
import { generateAutoTasks } from './autoTasks';

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

      const oldPlacement = await PlacementModel.findById(orgId, req.params.id);
      const extra: Record<string, unknown> = {};
      if (unit_id) extra.unit_id = unit_id;
      if (outcome) extra.outcome = outcome;

      const placement = await PlacementModel.updateStage(orgId, req.params.id, stage, extra);

      // Log stage_change activity event
      const actorId = req.orgMember!.id;
      let stageEventId: string | undefined;
      if (placement.client_id) {
        const event = await ActivityEventModel.create({
          org_id: orgId,
          client_id: placement.client_id,
          placement_id: placement.id,
          actor_id: actorId,
          event_type: 'stage_change',
          origin: 'user',
          metadata: { from: oldPlacement?.stage || null, to: stage },
        });
        stageEventId = event.id;
      }

      // Generate auto-tasks for the new stage
      if (placement.client_id) {
        const userEmail = (req as any).user?.email || 'system';
        await generateAutoTasks({
          orgId,
          placementId: placement.id,
          clientId: placement.client_id,
          stage,
          actorId,
          actorName: userEmail,
          assignToId: placement.case_manager_id,
          stageEventId,
        });
      }

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
  /**
   * PATCH /api/orgs/:orgSlug/clients/:id — update client
   */
  async updateClient(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const clientId = req.params.id;
      const allowedFields = [
        'first_name', 'last_name', 'status', 'household_size',
        'language_primary', 'language_secondary', 'budget_max',
        'preferred_area', 'income_range', 'phone', 'email',
        'accessibility_needs', 'cultural_preferences', 'case_manager_id',
      ];
      const updates: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields to update' });
      }
      const client = await ClientModel.update(orgId, clientId, updates as any);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      return res.json({ success: true, data: client });
    } catch (err) {
      console.error('updateClient error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * DELETE /api/orgs/:orgSlug/clients/:id — delete client
   */
  async deleteClient(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const deleted = await ClientModel.delete(orgId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      return res.json({ success: true, message: 'Client deleted' });
    } catch (err) {
      console.error('deleteClient error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * POST /api/orgs/:orgSlug/clients/bulk-delete — delete multiple clients
   */
  async bulkDeleteClients(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array is required' });
      }
      const count = await ClientModel.deleteBulk(orgId, ids);
      return res.json({ success: true, data: { deleted: count } });
    } catch (err) {
      console.error('bulkDeleteClients error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * POST /api/orgs/:orgSlug/clients/:id/photo — upload client photo
   */
  async uploadClientPhoto(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const clientId = req.params.id;
      const client = await ClientModel.findById(orgId, clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const photoUrl = `/api/uploads/client-photos/${clientId}.jpg`;
      await ClientModel.update(orgId, clientId, { photo_url: photoUrl } as any);
      return res.json({ success: true, data: { photo_url: photoUrl } });
    } catch (err) {
      console.error('uploadClientPhoto error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  /**
   * POST /api/orgs/:orgSlug/clients — create client
   */
  async createClient(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const client = await ClientModel.create({ ...req.body, org_id: orgId });
      return res.status(201).json({ success: true, data: client });
    } catch (err) {
      console.error('createClient error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // ── Activity Events ──────────────────────────────────────────────

  async getActivityEvents(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const clientId = req.params.clientId;
      const { event_type, placement_id, limit, offset } = req.query;
      const events = await ActivityEventModel.findByClient(orgId, clientId, {
        event_type: event_type as string | undefined,
        placement_id: placement_id as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      return res.json({ success: true, data: events });
    } catch (err) {
      console.error('getActivityEvents error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async createActivityEvent(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const clientId = req.params.clientId;
      const { event_type, title, body, note_type, placement_id, is_private, metadata } = req.body;
      const event = await ActivityEventModel.create({
        org_id: orgId,
        client_id: clientId,
        placement_id: placement_id || null,
        actor_id: req.orgMember!.id,
        event_type,
        origin: 'user',
        is_private: is_private || false,
        title: title || null,
        body: body || null,
        note_type: note_type || null,
        metadata: metadata || {},
      });
      return res.status(201).json({ success: true, data: event });
    } catch (err: any) {
      if (err.message?.startsWith('Invalid')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      console.error('createActivityEvent error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async getOrgActivityFeed(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const { limit } = req.query;
      const events = await ActivityEventModel.findByOrg(orgId, {
        limit: limit ? parseInt(limit as string) : 10,
      });
      return res.json({ success: true, data: events });
    } catch (err) {
      console.error('getOrgActivityFeed error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // ── Tasks ─────────────────────────────────────────────────────────

  async getClientTasks(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const clientId = req.params.clientId;
      const tasks = await TaskModel.findByClient(orgId, clientId);
      return res.json({ success: true, data: tasks });
    } catch (err) {
      console.error('getClientTasks error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async getMyTasks(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const memberId = req.orgMember!.id;
      const tasks = await TaskModel.findByAssignee(orgId, memberId);
      return res.json({ success: true, data: tasks });
    } catch (err) {
      console.error('getMyTasks error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async createTask(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const { client_id, placement_id, title, description, due_date, priority, assigned_to } = req.body;
      if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
      const userEmail = (req as any).user?.email || 'Unknown';
      const task = await TaskModel.create({
        org_id: orgId,
        client_id: client_id || null,
        placement_id: placement_id || null,
        assigned_to: assigned_to || req.orgMember!.id,
        created_by: req.orgMember!.id,
        created_by_name: userEmail,
        title,
        description: description || null,
        due_date: due_date || null,
        priority: priority || 'medium',
      });
      return res.status(201).json({ success: true, data: task });
    } catch (err) {
      console.error('createTask error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async updateTask(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const taskId = req.params.taskId;
      const allowedFields = ['title', 'description', 'due_date', 'priority', 'status', 'assigned_to'];
      const updates: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (updates.status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      const task = await TaskModel.update(orgId, taskId, updates as any);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      return res.json({ success: true, data: task });
    } catch (err) {
      console.error('updateTask error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  async completeTask(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const taskId = req.params.taskId;
      const task = await TaskModel.complete(orgId, taskId);
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

      // Log activity event
      if (task.client_id) {
        await ActivityEventModel.create({
          org_id: orgId,
          client_id: task.client_id,
          placement_id: task.placement_id,
          actor_id: req.orgMember!.id,
          event_type: 'task',
          origin: 'user',
          metadata: { task_id: task.id, action: 'completed', title: task.title },
        });
      }

      return res.json({ success: true, data: task });
    } catch (err) {
      console.error('completeTask error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // ── Document Checklist ────────────────────────────────────────────

  async toggleDocumentItem(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const placementId = req.params.id;
      const { doc_type, new_status } = req.body;
      if (!doc_type || !new_status) {
        return res.status(400).json({ success: false, message: 'doc_type and new_status required' });
      }

      const placement = await PlacementModel.findById(orgId, placementId);
      if (!placement) return res.status(404).json({ success: false, message: 'Placement not found' });

      const checklist = placement.document_checklist;
      const item = checklist.items.find((i) => i.type === doc_type);
      if (!item) return res.status(404).json({ success: false, message: 'Document type not found' });

      // Log activity event
      let activityEvent = null;
      if (placement.client_id) {
        activityEvent = await ActivityEventModel.create({
          org_id: orgId,
          client_id: placement.client_id,
          placement_id: placementId,
          actor_id: req.orgMember!.id,
          event_type: 'document',
          origin: 'user',
          metadata: { doc_type, action: new_status === 'collected' ? 'checked_off' : 'unchecked', label: item.label },
        });
      }

      item.status = new_status;
      item.updated_at = new Date().toISOString();
      item.activity_event_id = activityEvent?.id || null;

      const updated = await PlacementModel.updateDocumentChecklist(orgId, placementId, checklist);
      return res.json({ success: true, data: updated });
    } catch (err) {
      console.error('toggleDocumentItem error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // ── Dashboard ─────────────────────────────────────────────────────

  async getDashboardData(req: Request, res: Response) {
    try {
      const orgId = req.orgId!;
      const memberId = req.orgMember!.id;

      const [stageCounts, clientCounts, myTasks, taskCounts, recentActivity] = await Promise.all([
        PlacementModel.countByStage(orgId),
        ClientModel.countByOrg(orgId),
        TaskModel.findByAssignee(orgId, memberId),
        TaskModel.countByAssignee(orgId),
        ActivityEventModel.findByOrg(orgId, { limit: 10 }),
      ]);

      const overdueTasks = myTasks.filter(
        (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed',
      );

      return res.json({
        success: true,
        data: {
          stageCounts,
          clientCounts,
          myTasks,
          overdueTasks: overdueTasks.length,
          openTasks: myTasks.length,
          taskCounts,
          recentActivity,
        },
      });
    } catch (err) {
      console.error('getDashboardData error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};

export default PlacementController;
