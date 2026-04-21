import TaskModel from '../../models/Task';

interface AutoTaskDef {
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDaysOffset: number;
}

const STAGE_TASKS: Record<string, AutoTaskDef[]> = {
  intake: [
    { title: 'Complete client intake assessment', priority: 'high', dueDaysOffset: 3 },
  ],
  matching: [
    { title: 'Review top 3 unit matches', priority: 'high', dueDaysOffset: 2 },
    { title: 'Contact client about housing preferences', priority: 'medium', dueDaysOffset: 3 },
  ],
  proposed: [
    { title: 'Schedule client tour of proposed unit', priority: 'high', dueDaysOffset: 3 },
    { title: 'Send unit details to client', priority: 'medium', dueDaysOffset: 1 },
  ],
  accepted: [
    { title: 'Initiate lease review', priority: 'high', dueDaysOffset: 2 },
    { title: 'Verify all documents collected', priority: 'high', dueDaysOffset: 3 },
  ],
  placed: [
    { title: 'Schedule 7-day check-in', priority: 'medium', dueDaysOffset: 7 },
    { title: 'Schedule 30-day stability check', priority: 'medium', dueDaysOffset: 30 },
  ],
  closed: [
    { title: 'Complete outcome assessment', priority: 'medium', dueDaysOffset: 5 },
  ],
};

export async function generateAutoTasks(opts: {
  orgId: string;
  placementId: string;
  clientId: string;
  stage: string;
  actorId: string;
  actorName: string;
  assignToId: string | null;
  stageEventId?: string;
}): Promise<void> {
  const defs = STAGE_TASKS[opts.stage];
  if (!defs) return;

  for (const def of defs) {
    const sourceEvent = `stage:${opts.stage}`;

    // Idempotency: skip if this auto-task already exists for this placement+stage
    const existing = await TaskModel.findByClient(opts.orgId, opts.clientId);
    if (existing.some((t) => t.source_event === sourceEvent && t.title === def.title && t.placement_id === opts.placementId)) {
      continue;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + def.dueDaysOffset);

    await TaskModel.create({
      org_id: opts.orgId,
      client_id: opts.clientId,
      placement_id: opts.placementId,
      assigned_to: opts.assignToId || opts.actorId,
      created_by: opts.actorId,
      created_by_name: opts.actorName,
      title: def.title,
      due_date: dueDate.toISOString().slice(0, 10),
      priority: def.priority,
      auto_generated: true,
      source_event: sourceEvent,
      source_activity_event_id: opts.stageEventId || null,
    });
  }
}
