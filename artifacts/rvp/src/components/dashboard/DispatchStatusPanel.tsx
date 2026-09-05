import { useEffect } from "react";
import { useListTasks } from "@workspace/api-client-react";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DispatchStatusPanel({ parishId }: { parishId?: string }) {
  const { data: tasks, refetch } = useListTasks();

  // Poll every 10 seconds
  useEffect(() => {
    const id = setInterval(() => refetch(), 10_000);
    return () => clearInterval(id);
  }, [refetch]);

  const filtered = parishId ? tasks?.filter(t => t.parishId === parishId) : tasks;
  const assignedCount = filtered?.filter(t => t.status === 'assigned').length ?? 0;

  return (
    <div className="shrink-0 border border-border bg-card/40 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Dispatch Status
        </span>
        {assignedCount > 0 && (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] border bg-amber-500/10 text-amber-500 border-amber-500/20">
            {assignedCount} ACTIVE
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5 max-h-64 overflow-y-auto">
        {!filtered || filtered.length === 0 ? (
          <div className="py-4 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            No active dispatches
          </div>
        ) : (
          filtered.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-1 p-2 border border-border/40 rounded-sm bg-background/50"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className="font-mono text-[10px] font-bold uppercase text-foreground truncate flex-1"
                  title={task.title}
                >
                  {task.title}
                </span>
                <span
                  className={
                    "font-mono text-[10px] px-1 py-0.5 rounded-[2px] border shrink-0 " +
                    (task.status === 'assigned'
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : "bg-green-500/10 text-green-500 border-green-500/20")
                  }
                >
                  {task.status === 'assigned' ? 'ASSIGNED' : 'COMPLETED'}
                </span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground flex gap-3 flex-wrap">
                <span className="truncate max-w-[120px]" title={task.officer}>{task.officer}</span>
                <span>{task.parishName}</span>
                <span>{relativeTime(task.createdAt)}</span>
              </div>
              {task.status === 'completed' && task.fieldNote && (
                <div
                  className="font-mono text-[10px] text-muted-foreground/70 border-t border-border/30 pt-1 mt-0.5 truncate"
                  title={task.fieldNote}
                >
                  Note: {task.fieldNote}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
