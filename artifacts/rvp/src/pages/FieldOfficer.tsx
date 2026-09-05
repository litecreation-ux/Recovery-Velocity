import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetParishCitizenReports,
  useGetParishResources,
  useSubmitCitizenReport,
  getGetParishCitizenReportsQueryKey,
  useListTasks,
  useStartTask,
  useSubmitTask,
  getListTasksQueryKey,
} from '@workspace/api-client-react';
import { Radio, Fuel, Droplets, Stethoscope, AlertTriangle, CheckCircle2, Clock, ClipboardList } from 'lucide-react';

const PARISH_ID = 'st-elizabeth';
const FIELD_OFFICER_NAME = 'Officer James — St. Elizabeth';

export default function FieldOfficer() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState('infrastructure');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Task completion state: taskId -> { open: bool, note: string, justCompleted: bool }
  const [taskState, setTaskState] = useState<Record<string, { open: boolean; note: string; justCompleted: boolean }>>({});

  const { data: alerts } = useGetParishCitizenReports(PARISH_ID);
  const { data: resources } = useGetParishResources(PARISH_ID);
  const submit = useSubmitCitizenReport();

  const { data: tasks, refetch: refetchTasks } = useListTasks({ officer: FIELD_OFFICER_NAME });
  const startTask = useStartTask();
  const submitTask = useSubmitTask();

  // Poll every 10 seconds
  useEffect(() => {
    const id = setInterval(() => refetchTasks(), 10_000);
    return () => clearInterval(id);
  }, [refetchTasks]);

  const assignedTasks = tasks?.filter(t => t.status !== 'completed') ?? [];

  const getTaskState = (id: string) => taskState[id] ?? { open: false, note: '', justCompleted: false };

  const setTaskField = (id: string, patch: Partial<{ open: boolean; note: string; justCompleted: boolean }>) => {
    setTaskState(prev => ({ ...prev, [id]: { ...getTaskState(id), ...patch } }));
  };

  const handleComplete = (taskId: string) => {
    const note = getTaskState(taskId).note;
    submitTask.mutate(
      { id: taskId, data: { actor: FIELD_OFFICER_NAME, fieldNote: note } },
      {
        onSuccess: () => {
          setTaskField(taskId, { justCompleted: true, open: false });
          setTimeout(() => {
            setTaskField(taskId, { justCompleted: false });
            refetchTasks();
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
          }, 3000);
        },
      }
    );
  };

  const handleStart = (taskId: string) => {
    startTask.mutate(
      { id: taskId, data: { actor: FIELD_OFFICER_NAME } },
      {
        onSuccess: () => {
          refetchTasks();
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
        },
      },
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit.mutate(
      {
        parishId: PARISH_ID,
        data: {
          reporterName: name,
          content: description,
          category: type as 'infrastructure' | 'medical' | 'supplies' | 'flooding' | 'shelter' | 'other',
          location,
        },
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setName('');
          setType('infrastructure');
          setDescription('');
          setLocation('');
          setTimeout(() => setSubmitted(false), 3000);
          queryClient.invalidateQueries({
            queryKey: getGetParishCitizenReportsQueryKey(PARISH_ID),
          });
        },
      }
    );
  };

  const resourceColor = (pct: number) =>
    pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const resourceTextColor = (pct: number) =>
    pct >= 75 ? 'text-green-500' : pct >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="min-h-full bg-background p-4 flex flex-col gap-6 max-w-lg mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between border border-border bg-card/50 rounded-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Radio className="w-4 h-4 text-primary animate-pulse" />
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-foreground">Field Unit Leader</div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase">St. Elizabeth Zone</div>
          </div>
        </div>
        <div className="font-mono text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded-[2px] uppercase tracking-widest">
          {FIELD_OFFICER_NAME}
        </div>
      </header>

      {/* Section 0: Assigned Tasks */}
      <section className="flex flex-col gap-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ClipboardList className="w-3 h-3" /> Assigned Tasks ({assignedTasks.length})
        </div>

        {assignedTasks.length === 0 ? (
          <div className="border border-border bg-card/40 rounded-sm px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted-foreground opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground/30" />
              </span>
              <span className="font-mono text-xs text-muted-foreground">No active assignments</span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground/50 leading-relaxed">
              Tasks dispatched to <span className="text-primary">{FIELD_OFFICER_NAME}</span> from Incident Command will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {assignedTasks.map((task) => {
              const ts = getTaskState(task.id);
              if (ts.justCompleted) {
                return (
                  <div key={task.id} className="border border-green-500/20 bg-green-500/5 rounded-sm p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="font-mono text-xs text-green-500">✓ Evidence submitted — awaiting OPS verification</span>
                  </div>
                );
              }
              return (
                <div key={task.id} className="border border-primary/20 bg-card/40 rounded-sm p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-mono text-xs font-bold uppercase tracking-tight text-foreground mb-1">
                        {task.title}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground flex gap-3 flex-wrap mb-2">
                        <span>{task.parishName}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Assigned: {new Date(task.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{task.instructions}</p>
                      {task.scoreArea && (
                        <div className="mt-2 flex flex-wrap gap-2 font-mono text-[9px] uppercase">
                          <span className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">{task.scoreArea.replace('_', ' ')}</span>
                          <span className="text-muted-foreground">{task.evidenceStatus?.replace('_', ' ') ?? 'operational assignment'}</span>
                        </div>
                      )}
                      {task.expectedImpact && <p className="mt-2 text-[10px] text-primary">{task.expectedImpact}</p>}
                    </div>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] border uppercase shrink-0 ${task.status === 'pending_verification' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                       {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  {task.status === 'assigned' ? (
                    <button
                      onClick={() => handleStart(task.id)}
                      disabled={startTask.isPending}
                      className="self-start flex items-center gap-2 h-7 px-3 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-blue-950 font-mono text-[10px] uppercase tracking-widest transition-colors rounded-[2px]"
                    >
                      <Clock className="w-3 h-3" /> Start Work
                    </button>
                  ) : task.status === 'pending_verification' ? (
                    <div className="border border-violet-500/20 bg-violet-500/5 p-2 font-mono text-[10px] text-violet-400">
                      Evidence submitted — awaiting OPS verification
                      {task.fieldNote && <p className="mt-1 normal-case text-muted-foreground">{task.fieldNote}</p>}
                    </div>
                  ) : !ts.open ? (
                    <button
                      onClick={() => setTaskField(task.id, { open: true })}
                      className="self-start flex items-center gap-2 h-7 px-3 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground font-mono text-[10px] uppercase tracking-widest transition-colors rounded-[2px]"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Submit for Verification
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">Field Note</label>
                      <textarea
                        value={ts.note}
                        onChange={(e) => setTaskField(task.id, { note: e.target.value })}
                        rows={3}
                        placeholder="Describe what you found on the ground..."
                        className="bg-background border border-border rounded-sm px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleComplete(task.id)}
                          disabled={submitTask.isPending || !ts.note.trim()}
                          className="flex items-center gap-2 h-7 px-3 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-green-950 font-mono text-[10px] uppercase tracking-widest transition-colors rounded-[2px] disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {submitTask.isPending ? 'Submitting...' : 'Submit Evidence'}
                        </button>
                        <button
                          onClick={() => setTaskField(task.id, { open: false })}
                          className="flex items-center gap-2 h-7 px-3 bg-muted/10 text-muted-foreground border border-border/40 hover:bg-muted/20 font-mono text-[10px] uppercase tracking-widest transition-colors rounded-[2px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 1: Active Alerts */}
      <section className="flex flex-col gap-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="w-3 h-3" /> Active Alerts ({alerts?.length ?? 0})
        </div>
        <div className="flex flex-col gap-2">
          {!alerts || alerts.length === 0 ? (
            <div className="border border-border bg-card/40 rounded-sm p-4 text-center font-mono text-xs text-muted-foreground">
              No active alerts
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="border border-border bg-card/40 rounded-sm p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] uppercase text-primary">{alert.category}</span>
                  <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-foreground">{alert.content}</p>
                {alert.location && (
                  <p className="font-mono text-[10px] text-muted-foreground mt-1">LOC: {alert.location}</p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Section 2: Resource Status */}
      <section className="flex flex-col gap-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Resource Status</div>
        <div className="border border-border bg-card/40 rounded-sm p-4 flex flex-col gap-4">
          {resources ? (
            [
              { label: 'Fuel', icon: Fuel, pct: resources.fuelPercent },
              { label: 'Water', icon: Droplets, pct: resources.waterPercent },
              { label: 'Medical', icon: Stethoscope, pct: resources.medicalPercent },
            ].map(({ label, icon: Icon, pct }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase text-muted-foreground">
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                  <span className={`font-mono text-xs font-bold ${resourceTextColor(pct)}`}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${resourceColor(pct)} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="font-mono text-xs text-muted-foreground animate-pulse">Loading...</div>
          )}
        </div>
      </section>

      {/* Section 3: Submit Report */}
      <section className="flex flex-col gap-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Submit Report</div>
        <form onSubmit={handleSubmit} className="border border-border bg-card/40 rounded-sm p-4 flex flex-col gap-3">
          {submitted && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-sm px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="font-mono text-xs text-green-500">Report submitted successfully</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              className="bg-background border border-border rounded-sm px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Report Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-background border border-border rounded-sm px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="infrastructure">Infrastructure Damage</option>
              <option value="supplies">Supply Need</option>
              <option value="shelter">Citizen Evacuation</option>
              <option value="medical">Medical Emergency</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
              placeholder="Describe the situation..."
              className="bg-background border border-border rounded-sm px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Black River main road"
              className="bg-background border border-border rounded-sm px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            type="submit"
            disabled={submit.isPending}
            className="w-full h-9 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground font-mono text-xs uppercase tracking-widest transition-colors rounded-sm disabled:opacity-50"
          >
            {submit.isPending ? 'Transmitting...' : 'Submit Report'}
          </button>
        </form>
      </section>
    </div>
  );
}
