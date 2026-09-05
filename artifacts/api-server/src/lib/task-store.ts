import { randomUUID } from 'crypto';
import { db, auditLogTable, citizenReportsTable } from '@workspace/db';

export interface Task {
  id: string;
  incidentId: number;
  title: string;
  parishId: string;
  parishName: string;
  officer: string;
  instructions: string;
  scoreArea?: 'readiness' | 'recovery' | 'resilience' | 'incident_risk';
  recommendationId?: string;
  expectedImpact?: string;
  evidenceStatus?: 'planning_guidance' | 'partner_reported' | 'evidence_backed';
  scoreImpact: {
    area: 'readiness' | 'recovery' | 'resilience' | 'incident_risk';
    points: number;
    unlocked: boolean;
  };
  status: 'assigned' | 'in_progress' | 'pending_verification' | 'completed';
  createdAt: string;
  statusChangedAt: string;
  startedAt?: string;
  submittedAt?: string;
  completedAt?: string;
  fieldNote?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  lastActor?: string;
}

const tasks: Task[] = [
  {
    id: 'demo-task-001',
    incidentId: 0,
    title: 'Assess flood damage on Black River Road',
    parishId: 'st-elizabeth',
    parishName: 'St. Elizabeth',
    officer: 'Officer James — St. Elizabeth',
    instructions: 'Proceed to Black River main road and assess the extent of flood damage. Document road passability, any stranded civilians, and proximity to the fuel depot. Report back with current conditions and estimated clearance time.',
    scoreArea: 'recovery',
    expectedImpact: 'Verified access evidence can unlock recovery planning confidence.',
    scoreImpact: { area: 'recovery', points: 5, unlocked: false },
    status: 'assigned',
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 min ago
    statusChangedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
];

export function getTasks(officer?: string): Task[] {
  if (officer) return tasks.filter(t => t.officer === officer);
  return [...tasks];
}

export function createTask(input: Omit<Task, 'id' | 'status' | 'createdAt' | 'statusChangedAt' | 'scoreImpact'> & { impactPoints?: number }): Task {
  const now = new Date().toISOString();
  const task: Task = {
    ...input,
    id: randomUUID(),
    status: 'assigned',
    createdAt: now,
    statusChangedAt: now,
    scoreImpact: {
      area: input.scoreArea ?? 'incident_risk',
      points: input.impactPoints ?? 0,
      unlocked: false,
    },
  };
  tasks.push(task);
  return task;
}

// Keyword detection for ResourceExchangeAgent
export const COMPLETED_FIELD_NOTES: { taskId: string; note: string; parishId: string }[] = [];

type TransitionResult = { task: Task } | { error: string; notFound?: boolean };

async function logTransition(task: Task, action: string, actor: string): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      agentName: 'AuditLogger',
      action,
      parishId: task.parishId,
      parishName: task.parishName,
      details: `${actor} moved "${task.title}" to ${task.status.replace('_', ' ')} at ${task.statusChangedAt}.`,
    });
  } catch {
    // Audit persistence is non-fatal to the in-memory demo workflow.
  }
}

function findOwnedTask(id: string, actor: string): TransitionResult {
  const task = tasks.find(t => t.id === id);
  if (!task) return { error: 'Task not found', notFound: true };
  if (task.officer !== actor) return { error: 'Only the assigned Field Unit Leader can advance this task' };
  return { task };
}

export async function startTask(id: string, actor: string): Promise<TransitionResult> {
  const result = findOwnedTask(id, actor);
  if ('error' in result) return result;
  const { task } = result;
  if (task.status !== 'assigned') return { error: `Cannot start a task from ${task.status}` };
  const now = new Date().toISOString();
  task.status = 'in_progress';
  task.startedAt = now;
  task.statusChangedAt = now;
  task.lastActor = actor;
  await logTransition(task, 'Field task started', actor);
  return { task };
}

export async function submitTask(id: string, actor: string, fieldNote: string): Promise<TransitionResult> {
  const result = findOwnedTask(id, actor);
  if ('error' in result) return result;
  const { task } = result;
  if (task.status !== 'in_progress') return { error: `Cannot submit a task from ${task.status}` };
  const note = fieldNote.trim();
  if (!note) return { error: 'A field note is required before verification' };
  const now = new Date().toISOString();
  task.status = 'pending_verification';
  task.submittedAt = now;
  task.statusChangedAt = now;
  task.fieldNote = note;
  task.lastActor = actor;
  await logTransition(task, 'Field evidence submitted for OPS verification', actor);
  return { task };
}

export async function verifyTask(id: string, actor: string): Promise<TransitionResult> {
  const task = tasks.find(t => t.id === id);
  if (!task) return { error: 'Task not found', notFound: true };
  if (task.status !== 'pending_verification') return { error: `Cannot verify a task from ${task.status}` };
  if (!task.fieldNote?.trim()) return { error: 'Field evidence must be reviewed before verification' };
  const now = new Date().toISOString();
  task.status = 'completed';
  task.completedAt = now;
  task.verifiedAt = now;
  task.verifiedBy = actor;
  task.statusChangedAt = now;
  task.lastActor = actor;
  task.scoreImpact.unlocked = true;

  COMPLETED_FIELD_NOTES.push({ taskId: id, note: task.fieldNote, parishId: task.parishId });

  // Create citizen report from field note
  try {
    await db.insert(citizenReportsTable).values({
      parishId: task.parishId,
      reporterName: task.officer,
      content: `[TASK VERIFIED] ${task.title} — ${task.fieldNote}`,
      category: 'other',
      status: 'reviewed',
      location: task.parishName,
    });
  } catch {
    // non-fatal
  }

  // Audit log entry
  try {
    await db.insert(auditLogTable).values({
      agentName: 'AuditLogger',
      action: 'Task verified by OPS Section Chief',
      parishId: task.parishId,
      parishName: task.parishName,
      details: `${actor} verified task "${task.title}" submitted by ${task.officer}. Field note: ${task.fieldNote}`,
    });
  } catch {
    // non-fatal
  }

  return { task };
}

export async function completeTask(id: string, fieldNote: string, actor?: string): Promise<TransitionResult> {
  const task = tasks.find(t => t.id === id);
  if (!task) return { error: 'Task not found', notFound: true };
  const owner = actor?.trim() || task.officer;
  if (task.status === 'assigned') {
    const started = await startTask(id, owner);
    if ('error' in started) return started;
  }
  return submitTask(id, owner, fieldNote);
}

export async function logDispatch(task: Task): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      agentName: 'AuditLogger',
      action: 'Task dispatched to field officer',
      parishId: task.parishId,
      parishName: task.parishName,
      details: `"${task.title}" dispatched to ${task.officer}. Instructions: ${task.instructions.slice(0, 120)}${task.instructions.length > 120 ? '…' : ''}`,
    });
  } catch {
    // non-fatal
  }
}
