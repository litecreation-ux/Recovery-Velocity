import { useGetParishHistoricalEvents, getGetParishHistoricalEventsQueryKey } from "@workspace/api-client-react";
import { History } from "lucide-react";

export default function EventsPanel({ parishId }: { parishId: string }) {
  const { data: events, isLoading } = useGetParishHistoricalEvents(parishId, {
    query: { enabled: !!parishId, queryKey: getGetParishHistoricalEventsQueryKey(parishId) }
  });

  if (isLoading) {
    return (
      <div className="border border-border bg-card/40 rounded-sm p-4 animate-pulse h-64 flex items-center justify-center">
        <div className="h-4 w-24 bg-muted/50 rounded" />
      </div>
    );
  }

  return (
    <div className="border border-border bg-card/40 rounded-sm flex flex-col h-64">
      <div className="p-3 border-b border-border/50 bg-background/50 flex items-center gap-2 shrink-0">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Historical Events</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {(!events || events.length === 0) ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs">
            No events logged.
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="p-3 bg-background border border-border/50 rounded-sm hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-sm tracking-tight">{event.name} ({event.year})</h4>
                <div className="font-mono text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-[2px]">
                  CAT {event.category}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px] text-muted-foreground">
                <div>
                  <span className="uppercase opacity-60 block">Damage</span>
                  <span className="text-foreground">${event.damageMillion}M</span>
                </div>
                <div>
                  <span className="uppercase opacity-60 block">Fatalities</span>
                  <span className="text-foreground">{event.deaths}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}