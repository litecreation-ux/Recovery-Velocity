import { useListAgents, useListAuditLog } from "@workspace/api-client-react";
import { Terminal, Activity, Zap, Cpu, Server, ServerOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentMonitor() {
  const { data: agents, isLoading: loadingAgents } = useListAgents();
  const { data: logs, isLoading: loadingLogs } = useListAuditLog({ limit: 50 });

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4">
      <header className="flex items-center justify-between shrink-0 h-10 border border-border bg-card/50 backdrop-blur rounded-sm px-4">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Autonomous Agent Fleet
          </span>
        </div>
      </header>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 shrink-0">
        {loadingAgents ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 bg-card/40 border border-border rounded-sm animate-pulse" />
          ))
        ) : (
          agents?.map((agent) => {
            const isError = agent.status === 'error';
            const isActive = agent.status === 'active';
            const isPaused = agent.status === 'paused';
            
            return (
              <div 
                key={agent.id}
                className={cn(
                  "border rounded-sm p-3 relative overflow-hidden group",
                  isError ? "bg-red-500/5 border-red-500/30" : 
                  isActive ? "bg-primary/5 border-primary/30" : 
                  "bg-card/40 border-border"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-primary overflow-hidden">
                    <div className="w-1/2 h-full bg-white opacity-50 animate-[translate_2s_infinite]" />
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase font-bold text-foreground truncate max-w-[120px]">
                    {agent.name}
                  </span>
                  {isActive ? <Activity className="w-3 h-3 text-primary animate-pulse" /> :
                   isError ? <ServerOff className="w-3 h-3 text-red-500" /> :
                   <Server className="w-3 h-3 text-muted-foreground" />}
                </div>

                <div className="font-mono text-[9px] uppercase text-muted-foreground mb-3 truncate" title={agent.description}>
                  {agent.description}
                </div>

                <div className="mt-auto pt-2 border-t border-border/50">
                  <div className="font-mono text-[9px] text-muted-foreground mb-1">LAST ACTION:</div>
                  <div className="font-mono text-[10px] text-foreground truncate" title={agent.lastAction}>
                    {agent.lastAction || "AWAITING INSTRUCTIONS"}
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {agent.parishesMonitored.slice(0, 3).map(p => (
                      <span key={p} className="text-[8px] font-mono px-1 border border-border bg-background rounded-[1px] uppercase truncate max-w-[50px]">
                        {p}
                      </span>
                    ))}
                    {agent.parishesMonitored.length > 3 && (
                      <span className="text-[8px] font-mono px-1 text-muted-foreground">+{agent.parishesMonitored.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Audit Log */}
      <div className="flex-1 min-h-0 border border-border bg-card/40 rounded-sm flex flex-col font-mono text-[11px]">
        <div className="px-4 py-2 border-b border-border/50 bg-muted/20 shrink-0 flex items-center gap-2 text-muted-foreground uppercase tracking-widest text-[10px]">
          <Cpu className="w-3.5 h-3.5" /> Fleet Telemetry Log
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loadingLogs ? (
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-1/2 bg-muted/20 rounded" />
              <div className="h-3 w-2/3 bg-muted/20 rounded" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-muted-foreground italic">No telemetry data.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex gap-4 hover:bg-muted/10 px-2 py-1 -mx-2 rounded-[2px] transition-colors group">
                <div className="text-muted-foreground/60 shrink-0 w-32">
                  {new Date(log.timestamp).toISOString().substring(11, 23)}
                </div>
                <div className="text-primary shrink-0 w-32 truncate" title={log.agentName}>
                  [{log.agentName}]
                </div>
                <div className="text-foreground shrink-0 w-48 truncate text-amber-500/80">
                  {log.action}
                </div>
                <div className="text-muted-foreground truncate flex-1 flex gap-2">
                  {log.parishId !== 'global' && (
                    <span className="text-foreground/80 shrink-0">({log.parishName})</span>
                  )}
                  <span className="truncate group-hover:text-foreground transition-colors">{log.details}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}