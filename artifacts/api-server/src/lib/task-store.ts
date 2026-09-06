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

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const tasks: Task[] = [
  {
    id: 'seed-assigned-001',
    incidentId: 0,
    title: 'Assess flood damage on Black River Road',
    parishId: 'st-elizabeth',
    parishName: 'St. Elizabeth',
    officer: 'Officer James — St. Elizabeth',
    instructions: 'Assess road passability, stranded civilians, and access to the fuel depot.',
    scoreArea: 'recovery',
    expectedImpact: 'Verified access evidence can unlock recovery planning confidence.',
    scoreImpact: { area: 'recovery', points: 5, unlocked: false },
    status: 'assigned',
    createdAt: minutesAgo(18),
    statusChangedAt: minutesAgo(18),
  },
  {
    id: 'seed-assigned-002',
    incidentId: 0,
    title: 'Confirm shelter generator fuel reserve',
    parishId: 'kingston',
    parishName: 'Kingston',
    officer: 'Officer Campbell — Kingston',
    instructions: 'Confirm generator condition and fuel hours remaining at the primary emergency shelter.',
    scoreArea: 'readiness',
    expectedImpact: 'Verified backup-power capacity improves shelter readiness.',
    scoreImpact: { area: 'readiness', points: 4, unlocked: false },
    status: 'assigned',
    createdAt: minutesAgo(42),
    statusChangedAt: minutesAgo(42),
  },
  {
    id: 'seed-assigned-003',
    incidentId: 0,
    title: 'Inspect coastal evacuation route signage',
    parishId: 'st-thomas',
    parishName: 'St. Thomas',
    officer: 'Officer Morgan — St. Thomas',
    instructions: 'Inspect evacuation signs between Morant Bay and the designated upland assembly point.',
    scoreArea: 'incident_risk',
    expectedImpact: 'Route confirmation reduces evacuation delay risk.',
    scoreImpact: { area: 'incident_risk', points: 3, unlocked: false },
    status: 'assigned',
    createdAt: minutesAgo(75),
    statusChangedAt: minutesAgo(75),
  },
  {
    id: 'seed-progress-001',
    incidentId: 0,
    title: 'Survey blocked access near Annotto Bay',
    parishId: 'st-mary',
    parishName: 'St. Mary',
    officer: 'Officer Reid — St. Mary',
    instructions: 'Survey debris and flooding affecting emergency vehicle access near Annotto Bay.',
    scoreArea: 'recovery',
    expectedImpact: 'Current access evidence supports clearance prioritization.',
    scoreImpact: { area: 'recovery', points: 5, unlocked: false },
    status: 'in_progress',
    createdAt: minutesAgo(150),
    statusChangedAt: minutesAgo(37),
    startedAt: minutesAgo(37),
    lastActor: 'Officer Reid — St. Mary',
  },
  {
    id: 'seed-progress-002',
    incidentId: 0,
    title: 'Verify clinic communications coverage',
    parishId: 'clarendon',
    parishName: 'Clarendon',
    officer: 'Officer Brown — Clarendon',
    instructions: 'Test mobile and radio communications at three priority clinics.',
    scoreArea: 'readiness',
    expectedImpact: 'Confirmed communications improve medical response readiness.',
    scoreImpact: { area: 'readiness', points: 4, unlocked: false },
    status: 'in_progress',
    createdAt: minutesAgo(210),
    statusChangedAt: minutesAgo(64),
    startedAt: minutesAgo(64),
    lastActor: 'Officer Brown — Clarendon',
  },
  {
    id: 'seed-progress-003',
    incidentId: 0,
    title: 'Check community water distribution points',
    parishId: 'portland',
    parishName: 'Portland',
    officer: 'Officer Williams — Portland',
    instructions: 'Confirm access, storage capacity, and staffing at water distribution points.',
    scoreArea: 'resilience',
    expectedImpact: 'Verified distribution capacity strengthens community resilience.',
    scoreImpact: { area: 'resilience', points: 6, unlocked: false },
    status: 'in_progress',
    createdAt: minutesAgo(260),
    statusChangedAt: minutesAgo(91),
    startedAt: minutesAgo(91),
    lastActor: 'Officer Williams — Portland',
  },
  {
    id: 'seed-pending-001',
    incidentId: 0,
    title: 'Document bridge condition at Rio Cobre',
    parishId: 'st-catherine',
    parishName: 'St. Catherine',
    officer: 'Officer Lewis — St. Catherine',
    instructions: 'Photograph visible bridge damage and confirm whether emergency vehicles can cross.',
    scoreArea: 'recovery',
    expectedImpact: 'Verified bridge access supports recovery routing.',
    evidenceStatus: 'partner_reported',
    scoreImpact: { area: 'recovery', points: 7, unlocked: false },
    status: 'pending_verification',
    createdAt: minutesAgo(430),
    statusChangedAt: minutesAgo(48),
    startedAt: minutesAgo(180),
    submittedAt: minutesAgo(48),
    fieldNote: 'Both lanes are open to light vehicles. Heavy trucks are being held pending an engineering inspection of the eastern approach.',
    lastActor: 'Officer Lewis — St. Catherine',
  },
  {
    id: 'seed-pending-002',
    incidentId: 0,
    title: 'Confirm emergency food stock at shelter',
    parishId: 'manchester',
    parishName: 'Manchester',
    officer: 'Officer Grant — Manchester',
    instructions: 'Count food stock and compare quantities with the registered shelter population.',
    scoreArea: 'readiness',
    expectedImpact: 'Validated supply coverage improves shelter readiness.',
    evidenceStatus: 'partner_reported',
    scoreImpact: { area: 'readiness', points: 5, unlocked: false },
    status: 'pending_verification',
    createdAt: minutesAgo(510),
    statusChangedAt: minutesAgo(76),
    startedAt: minutesAgo(240),
    submittedAt: minutesAgo(76),
    fieldNote: 'The shelter has 420 ready-to-eat meals and potable water for approximately 48 hours at the current occupancy.',
    lastActor: 'Officer Grant — Manchester',
  },
  {
    id: 'seed-pending-003',
    incidentId: 0,
    title: 'Validate landslide warning signs',
    parishId: 'st-andrew',
    parishName: 'St. Andrew',
    officer: 'Officer Taylor — St. Andrew',
    instructions: 'Confirm warning signs and barriers are installed at two reported landslide zones.',
    scoreArea: 'incident_risk',
    expectedImpact: 'Verified warning controls reduce public exposure.',
    evidenceStatus: 'partner_reported',
    scoreImpact: { area: 'incident_risk', points: 4, unlocked: false },
    status: 'pending_verification',
    createdAt: minutesAgo(620),
    statusChangedAt: minutesAgo(105),
    startedAt: minutesAgo(310),
    submittedAt: minutesAgo(105),
    fieldNote: 'Barriers and warning signs are installed at both sites. One solar warning lamp requires replacement before nightfall.',
    lastActor: 'Officer Taylor — St. Andrew',
  },
  {
    id: 'seed-completed-001',
    incidentId: 0,
    title: 'Verify hospital backup power test',
    parishId: 'kingston',
    parishName: 'Kingston',
    officer: 'Officer Campbell — Kingston',
    instructions: 'Observe the scheduled generator transfer test and record the result.',
    scoreArea: 'readiness',
    expectedImpact: 'A verified transfer test improves critical-facility readiness.',
    evidenceStatus: 'evidence_backed',
    scoreImpact: { area: 'readiness', points: 8, unlocked: true },
    status: 'completed',
    createdAt: minutesAgo(1600),
    statusChangedAt: minutesAgo(390),
    startedAt: minutesAgo(1420),
    submittedAt: minutesAgo(430),
    completedAt: minutesAgo(390),
    verifiedAt: minutesAgo(390),
    verifiedBy: 'OPS Section Chief',
    fieldNote: 'Automatic transfer completed in 11 seconds. Generator carried the tested emergency circuits without alarms.',
    lastActor: 'OPS Section Chief',
  },
  {
    id: 'seed-completed-002',
    incidentId: 0,
    title: 'Clear debris from fire station access',
    parishId: 'westmoreland',
    parishName: 'Westmoreland',
    officer: 'Officer Davis — Westmoreland',
    instructions: 'Confirm debris removal and unrestricted emergency vehicle access.',
    scoreArea: 'recovery',
    expectedImpact: 'Restored station access supports response and recovery operations.',
    evidenceStatus: 'evidence_backed',
    scoreImpact: { area: 'recovery', points: 6, unlocked: true },
    status: 'completed',
    createdAt: minutesAgo(2100),
    statusChangedAt: minutesAgo(720),
    startedAt: minutesAgo(1850),
    submittedAt: minutesAgo(760),
    completedAt: minutesAgo(720),
    verifiedAt: minutesAgo(720),
    verifiedBy: 'OPS Section Chief',
    fieldNote: 'Debris was removed and both apparatus bays now have clear road access.',
    lastActor: 'OPS Section Chief',
  },
  {
    id: 'seed-completed-003',
    incidentId: 0,
    title: 'Confirm community radio repeater service',
    parishId: 'hanover',
    parishName: 'Hanover',
    officer: 'Officer Miller — Hanover',
    instructions: 'Test repeater coverage with the parish EOC and two remote communities.',
    scoreArea: 'resilience',
    expectedImpact: 'Verified radio coverage strengthens communications resilience.',
    evidenceStatus: 'evidence_backed',
    scoreImpact: { area: 'resilience', points: 7, unlocked: true },
    status: 'completed',
    createdAt: minutesAgo(2900),
    statusChangedAt: minutesAgo(1180),
    startedAt: minutesAgo(2550),
    submittedAt: minutesAgo(1230),
    completedAt: minutesAgo(1180),
    verifiedAt: minutesAgo(1180),
    verifiedBy: 'OPS Section Chief',
    fieldNote: 'Clear two-way radio checks were completed with the parish EOC and both remote test locations.',
    lastActor: 'OPS Section Chief',
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
