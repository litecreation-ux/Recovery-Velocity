import { Router, type IRouter } from 'express';
import { createTask, completeTask, getTasks, logDispatch, startTask, submitTask, verifyTask } from '../lib/task-store.js';
import {
  CompleteTaskBody,
  CompleteTaskResponse,
  DispatchTaskBody,
  DispatchTaskResponse,
  StartTaskBody,
  StartTaskResponse,
  SubmitTaskBody,
  SubmitTaskResponse,
  VerifyTaskBody,
  VerifyTaskResponse,
} from '@workspace/api-zod';

const router: IRouter = Router();

router.post('/tasks/dispatch', async (req, res): Promise<void> => {
  const parsed = DispatchTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid task dispatch body', details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  if (![data.title, data.parishId, data.parishName, data.officer, data.instructions].every((value) => value.trim().length > 0)) {
    res.status(400).json({ error: 'Required task fields cannot be blank' });
    return;
  }
  if (data.incidentId > 0 && getTasks().some((task) => task.incidentId === data.incidentId)) {
    res.status(409).json({ error: 'This incident has already been dispatched' });
    return;
  }
  const task = createTask({
    ...data,
    title: data.title.trim(),
    parishId: data.parishId.trim(),
    parishName: data.parishName.trim(),
    officer: data.officer.trim(),
    instructions: data.instructions.trim(),
    recommendationId: data.recommendationId?.trim() || undefined,
    expectedImpact: data.expectedImpact?.trim() || undefined,
  });
  await logDispatch(task);
  res.status(201).json(DispatchTaskResponse.parse(task));
});

router.get('/tasks', (req, res): void => {
  const officer = typeof req.query.officer === 'string' ? req.query.officer : undefined;
  res.json(getTasks(officer));
});

router.post('/tasks/:id/complete', async (req, res): Promise<void> => {
  const { id } = req.params;
  const parsed = CompleteTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A field note is required' });
    return;
  }
  const result = await completeTask(id, parsed.data.fieldNote, parsed.data.actor);
  if ('error' in result) {
    res.status(result.notFound ? 404 : 409).json({ error: result.error });
    return;
  }
  res.json(CompleteTaskResponse.parse(result.task));
});

router.post('/tasks/:id/start', async (req, res): Promise<void> => {
  const parsed = StartTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'actor is required' });
    return;
  }
  const result = await startTask(String(req.params.id), parsed.data.actor.trim());
  if ('error' in result) {
    res.status(result.notFound ? 404 : 409).json({ error: result.error });
    return;
  }
  res.json(StartTaskResponse.parse(result.task));
});

router.post('/tasks/:id/submit', async (req, res): Promise<void> => {
  const parsed = SubmitTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'actor and fieldNote are required' });
    return;
  }
  const result = await submitTask(String(req.params.id), parsed.data.actor.trim(), parsed.data.fieldNote);
  if ('error' in result) {
    res.status(result.notFound ? 404 : 409).json({ error: result.error });
    return;
  }
  res.json(SubmitTaskResponse.parse(result.task));
});

router.post('/tasks/:id/verify', async (req, res): Promise<void> => {
  const parsed = VerifyTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'actor is required' });
    return;
  }
  const result = await verifyTask(String(req.params.id), parsed.data.actor.trim());
  if ('error' in result) {
    res.status(result.notFound ? 404 : 409).json({ error: result.error });
    return;
  }
  res.json(VerifyTaskResponse.parse(result.task));
});

export default router;
