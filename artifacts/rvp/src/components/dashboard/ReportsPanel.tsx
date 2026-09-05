import { 
  useGetParishCitizenReports, 
  getGetParishCitizenReportsQueryKey,
  useSubmitCitizenReport,
  CitizenReportInputCategory 
} from "@workspace/api-client-react";
import { MessageSquare, AlertCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function ReportsPanel({ parishId }: { parishId: string }) {
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useGetParishCitizenReports(parishId, {
    query: { enabled: !!parishId, queryKey: getGetParishCitizenReportsQueryKey(parishId) }
  });
  
  const submitReport = useSubmitCitizenReport();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTestSubmit = () => {
    setIsSubmitting(true);
    submitReport.mutate(
      {
        parishId,
        data: {
          reporterName: "HQ-TEST-NODE",
          content: "Simulated field intel entry. Connection stable.",
          category: "other" as CitizenReportInputCategory
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetParishCitizenReportsQueryKey(parishId) });
          setIsSubmitting(false);
        },
        onError: () => setIsSubmitting(false)
      }
    );
  };

  if (isLoading) {
    return (
      <div className="border border-border bg-card/40 rounded-sm p-4 animate-pulse h-64 flex items-center justify-center">
        <div className="h-4 w-24 bg-muted/50 rounded" />
      </div>
    );
  }

  return (
    <div className="border border-border bg-card/40 rounded-sm flex flex-col h-64">
      <div className="p-3 border-b border-border/50 bg-background/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Citizen Intel</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleTestSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1 font-mono text-[9px] uppercase border border-border px-1.5 py-0.5 rounded-[2px] hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
          >
            <Plus className="w-3 h-3" /> Insert Test Report
          </button>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {(!reports || reports.length === 0) ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs">
            No active reports.
          </div>
        ) : (
          reports.map(report => (
            <div key={report.id} className="p-3 bg-background border border-border/50 rounded-sm flex gap-3">
              <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">{report.category}</span>
                  <span className="font-mono text-[9px] text-muted-foreground opacity-60">
                    {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs leading-relaxed truncate whitespace-normal line-clamp-2">
                  {report.content}
                </p>
                <div className="mt-2 font-mono text-[9px] text-muted-foreground flex justify-between">
                  <span>SRC: {report.reporterName}</span>
                  <span className={report.status === 'pending' ? 'text-amber-500' : 'text-green-500'}>
                    [{report.status.toUpperCase()}]
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}