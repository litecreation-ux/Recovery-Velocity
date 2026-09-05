import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListTasksQueryKey,
  useListTasks,
  useVerifyTask,
  type Task,
  type TaskStatus,
} from "@workspace/api-client-react";
import { CheckCircle2, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";

const OPS_ACTOR = "OPS Section Chief";
const columns: Array<{ status: TaskStatus; label: string; tone: string }> = [
  { status: "assigned", label: "Assigned", tone: "text-amber-500" },
  { status: "in_progress", label: "In Progress", tone: "text-blue-400" },
  { status: "pending_verification", label: "Pending Verification", tone: "text-violet-400" },
  { status: "completed", label: "Completed", tone: "text-green-500" },
];

function elapsed(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export default function TaskManager() {
  const { role } = useRole();
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useListTasks({}, { query: { queryKey: getListTasksQueryKey({}), refetchInterval: 10_000 } });
  const verify = useVerifyTask();
  const [parish, setParish] = useState("all");
  const [area, setArea] = useState("all");
  const [error, setError] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);

  const filtered = tasks.filter((task) =>
    (parish === "all" || task.parishId === parish) &&
    (area === "all" || task.scoreImpact.area === area)
  );
  const parishes = useMemo(() => [...new Map(tasks.map((task) => [task.parishId, task.parishName])).entries()], [tasks]);
  const today = new Date().toDateString();
  const metrics = [
    ["Assigned today", tasks.filter((t) => new Date(t.createdAt).toDateString() === today).length],
    ["In progress", tasks.filter((t) => t.status === "in_progress").length],
    ["Pending verification", tasks.filter((t) => t.status === "pending_verification").length],
    ["Completed", tasks.filter((t) => t.status === "completed").length],
    ["Verified points unlocked", tasks.reduce((sum, t) => sum + (t.scoreImpact.unlocked ? t.scoreImpact.points : 0), 0)],
  ];

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({}) });
  const fail = (err: unknown) => setError((err as { data?: { error?: string } })?.data?.error ?? "That transition is not allowed.");
  const transition = (task: Task, target: TaskStatus) => {
    setError("");
    if (task.status === "pending_verification" && target === "completed" && role === "parish_manager") {
      verify.mutate({ id: task.id, data: { actor: OPS_ACTOR } }, { onSuccess: refresh, onError: fail });
    } else {
      setError(target === "pending_verification"
        ? "Field evidence must be submitted by the assigned leader from the Field Reports page."
        : "Only the assigned Field Unit Leader or OPS Section Chief can make that transition.");
    }
  };

  if (role !== "national_coordinator" && role !== "parish_manager") {
    return <div className="p-8 font-mono text-sm text-red-500">Task Manager is restricted to Incident Command and OPS.</div>;
  }

  return (
    <div className="min-h-full bg-background p-4">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="border border-border bg-card/50 p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">Field accountability</div>
          <h1 className="mt-1 text-xl font-bold uppercase">Task Manager</h1>
          <p className="mt-1 text-[11px] text-muted-foreground">Field evidence remains locked until OPS verification. Planning scores do not change during assignment or submission.</p>
        </header>
        <section className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-5">
          {metrics.map(([label, value]) => <div key={label} className="bg-card p-3"><div className="font-mono text-2xl font-bold">{value}</div><div className="font-mono text-[8px] uppercase text-muted-foreground">{label}</div></div>)}
        </section>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filter by parish" value={parish} onChange={(e) => setParish(e.target.value)} className="h-9 border border-border bg-card px-3 font-mono text-[9px] uppercase">
            <option value="all">All parishes</option>{parishes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select aria-label="Filter by score component" value={area} onChange={(e) => setArea(e.target.value)} className="h-9 border border-border bg-card px-3 font-mono text-[9px] uppercase">
            <option value="all">All score components</option>{["readiness", "recovery", "resilience", "incident_risk"].map((v) => <option key={v} value={v}>{v.replace("_", " ")}</option>)}
          </select>
        </div>
        {error && <div role="alert" className="border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500">{error}</div>}
        {isLoading ? <div className="p-8 font-mono text-xs text-muted-foreground">Loading tasks…</div> : (
          <div className="grid gap-3 xl:grid-cols-4">
            {columns.map((column) => (
              <section key={column.status} onDragOver={(e) => e.preventDefault()} onDrop={() => {
                const task = tasks.find((item) => item.id === dragged);
                if (task && role === "parish_manager" && task.status === "pending_verification" && column.status === "completed") {
                  transition(task, column.status);
                }
                setDragged(null);
              }} className="min-h-72 border border-border bg-card/30 p-3">
                <div className={cn("mb-3 flex items-center justify-between font-mono text-[10px] uppercase", column.tone)}><span>{column.label}</span><span>{filtered.filter((t) => t.status === column.status).length}</span></div>
                <div className="space-y-3">
                  {filtered.filter((t) => t.status === column.status).map((task) => (
                    <article
                      key={task.id}
                      draggable={role === "parish_manager" && task.status === "pending_verification"}
                      onDragStart={() => {
                        if (role === "parish_manager" && task.status === "pending_verification") setDragged(task.id);
                      }}
                      className={cn("border border-border bg-background p-3", role === "parish_manager" && task.status === "pending_verification" && "cursor-grab")}
                    >
                      <h2 className="text-xs font-bold uppercase">{task.title}</h2>
                      <div className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">{task.parishName} · {task.officer}</div>
                      <div className="mt-2 flex items-center gap-1 font-mono text-[8px] uppercase text-muted-foreground"><Clock3 className="h-3 w-3" /> {elapsed(task.statusChangedAt)} in status</div>
                      <div className="mt-3 border border-border bg-muted/20 p-2 font-mono text-[8px] uppercase">
                        <div>{task.scoreImpact.area.replace("_", " ")}</div>
                        <div className={cn("mt-1 flex items-center gap-1", task.scoreImpact.unlocked ? "text-green-500" : "text-amber-500")}>
                          {task.scoreImpact.unlocked ? <ShieldCheck className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
                          +{task.scoreImpact.points} points {task.scoreImpact.unlocked ? "verified" : "locked"}
                        </div>
                      </div>
                      {task.fieldNote && <blockquote className="mt-2 border-l-2 border-primary/40 pl-2 text-[10px] text-muted-foreground">{task.fieldNote}</blockquote>}
                      {role === "parish_manager" && task.status === "pending_verification" && (
                        <button onClick={() => transition(task, "completed")} className="mt-3 flex items-center gap-1 bg-green-500/10 px-2 py-1.5 font-mono text-[8px] uppercase text-green-500"><CheckCircle2 className="h-3 w-3" /> Review note & verify</button>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}