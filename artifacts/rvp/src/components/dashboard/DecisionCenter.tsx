import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReviewItems,
  useUpdateReviewItem,
  getListReviewItemsQueryKey,
  useDispatchTask,
  useListTasks,
  getListTasksQueryKey,
  useGetParish,
  getGetParishQueryKey,
  useListResourceOperationalStatuses,
  getListResourceOperationalStatusesQueryKey,
  useAssessRegionalAid,
  type ReviewItem,
  type ParishDetail,
  type ResourceOperationalStatus,
} from "@workspace/api-client-react";
import { ShieldAlert, Check, X, Clock, AlertTriangle, Send, Activity, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { RegionalAidReviewDetails } from "./RegionalAidReviewDetails";

const MOCK_OFFICERS = [
  { value: 'Officer Reid — Kingston',         label: 'Officer Reid — Kingston' },
  { value: 'Officer Brown — St. Thomas',      label: 'Officer Brown — St. Thomas' },
  { value: 'Officer Campbell — Westmoreland', label: 'Officer Campbell — Westmoreland' },
  { value: 'Officer White — Hanover',         label: 'Officer White — Hanover' },
  { value: 'Officer James — St. Elizabeth',   label: 'Officer James — St. Elizabeth' },
  { value: 'Officer Clarke — Portland',       label: 'Officer Clarke — Portland' },
];

export default function DecisionCenter({
  scope,
  title,
  reviewerId,
  contextParishId,
  filterParishId,
}: {
  scope: 'national' | 'parish';
  title: string;
  reviewerId: string;
  contextParishId: string;
  filterParishId?: string;
}) {
  const queryClient = useQueryClient();
  const { role } = useRole();
  const [location] = useLocation();
  const updateItem = useUpdateReviewItem();
  const assessRegionalAid = useAssessRegionalAid();
  const dispatchTask = useDispatchTask();
  const { data: allItems, isLoading: isItemsLoading } = useListReviewItems();
  const { data: tasks } = useListTasks();
  const items = allItems ? (filterParishId ? allItems.filter(i => i.parishId === filterParishId) : allItems) : [];
  const requestedIncidentId = Number(new URLSearchParams(window.location.search).get("incidentId"));
  const [dispatching, setDispatching] = useState<number | null>(null);
  const [justApprovedId, setJustApprovedId] = useState<number | null>(null);
  const [dispatchedIds, setDispatchedIds] = useState<Set<number>>(new Set());
  const [dispatchError, setDispatchError] = useState("");
  const [decliningId, setDecliningId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [aidAssessmentStatus, setAidAssessmentStatus] = useState("");
  const [dispatchForm, setDispatchForm] = useState<{
    officer: string;
    instructions: string;
  }>({ officer: '', instructions: '' });

  const contextFirst = (a: ReviewItem, b: ReviewItem) =>
    Number(b.parishId === contextParishId) - Number(a.parishId === contextParishId);
  const pendingItems = items
    .filter((item) => item.status === 'pending' && item.id !== justApprovedId)
    .sort(contextFirst);
  const approvedItems = items
    .filter((item) =>
      (item.status === 'approved' || item.id === justApprovedId) &&
      !dispatchedIds.has(item.id) &&
      !tasks?.some((task) => task.incidentId === item.id)
    )
    .sort(contextFirst);

  const currentItem = dispatching != null
    ? items.find((item) => item.id === dispatching)
    : (items.find((item) => item.id === requestedIncidentId) ?? pendingItems[0] ?? approvedItems[0]);
  const activeContextParishId = currentItem?.parishId ?? contextParishId;
  const { data: parish, isLoading: isParishLoading } = useGetParish(activeContextParishId, {
    query: { enabled: !!activeContextParishId, queryKey: getGetParishQueryKey(activeContextParishId) }
  });
  const { data: resources, isLoading: isResourcesLoading } = useListResourceOperationalStatuses(
    { parishId: activeContextParishId },
    { query: { enabled: !!activeContextParishId, queryKey: getListResourceOperationalStatusesQueryKey({ parishId: activeContextParishId }), refetchInterval: 30000 } }
  );

  useEffect(() => {
    if (dispatching != null) {
      const dispatchItem = items.find((item) => item.id === dispatching);
      if (dispatchItem?.status === 'rejected') {
        setDispatching(null);
        if (justApprovedId === dispatching) setJustApprovedId(null);
        return;
      }
    }
    if (justApprovedId == null) return;
    const authoritativeItem = items.find((item) => item.id === justApprovedId);
    if (authoritativeItem?.status === 'approved') {
      setJustApprovedId(null);
    } else if (authoritativeItem?.status === 'rejected') {
      setJustApprovedId(null);
      if (dispatching === justApprovedId) setDispatching(null);
    }
  }, [dispatching, items, justApprovedId]);

  const handleAction = (id: number, status: 'approved' | 'rejected', reason?: string) => {
    const item = items.find(i => i.id === id);
    const trimmedReason = reason?.trim();
    if (status === 'rejected' && !trimmedReason) {
      setDecisionError("A reason is required before declining this incident.");
      return;
    }
    setDecisionError("");
    updateItem.mutate(
      {
        id,
        data: {
          status,
          reviewedBy: reviewerId,
          ...(trimmedReason ? { reason: trimmedReason } : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReviewItemsQueryKey() });
          setDecliningId(null);
          setDeclineReason("");
          if (status === 'approved' && item && !item.metadata) {
            setDispatchForm({
              officer: '',
              instructions: item.description,
            });
            setJustApprovedId(id);
            setDispatching(id);
          } else {
            setJustApprovedId(null);
            setDispatching(null);
          }
        },
        onError: () => setDecisionError("The decision could not be recorded. Please try again."),
      }
    );
  };

  const handleRegionalAidAssessment = () => {
    setAidAssessmentStatus("");
    assessRegionalAid.mutate(
      { data: { parishId: filterParishId ?? contextParishId } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: getListReviewItemsQueryKey() });
          setAidAssessmentStatus(result.created
            ? "Draft prepared and added to the human review queue."
            : result.reason ?? "No draft was created.");
        },
        onError: () => setAidAssessmentStatus("The evidence assessment could not prepare a safe draft. No request was created."),
      },
    );
  };

  const handleDispatch = (item: ReviewItem) => {
    if (!dispatchForm.officer) return;
    setDispatchError("");
    dispatchTask.mutate(
      {
        data: {
          incidentId: item.id,
          title: item.title,
          parishId: item.parishId,
          parishName: item.parishName,
          officer: dispatchForm.officer,
          instructions: dispatchForm.instructions,
        },
      },
      {
        onSuccess: () => {
          setDispatchedIds(prev => new Set([...prev, item.id]));
          setJustApprovedId(null);
          setDispatching(null);
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        },
        onError: () => setDispatchError("This incident may already be dispatched. Refresh the queue before trying again."),
      }
    );
  };

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden" data-testid={`page-decision-center-${scope}`}>
      <header className="px-4 lg:px-6 py-4 border-b border-border bg-card/50 backdrop-blur shrink-0 flex flex-col gap-1 z-10 shadow-sm relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h1 className="font-mono text-lg uppercase tracking-widest font-bold text-foreground">
              {title}
            </h1>
          </div>
          {(role === "national_coordinator" || role === "parish_manager") && (
            <button
              type="button"
              onClick={handleRegionalAidAssessment}
              disabled={assessRegionalAid.isPending}
              data-testid="button-prepare-regional-aid"
              className="inline-flex h-9 items-center gap-2 rounded-sm border border-cyan-500/30 bg-cyan-500/10 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition-colors hover:bg-cyan-500/20 disabled:cursor-wait disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {assessRegionalAid.isPending ? "Assessing evidence..." : "Prepare regional aid request"}
            </button>
          )}
        </div>
        <p className="font-mono text-xs text-muted-foreground mt-1" data-testid="status-command-queue">
          {isItemsLoading ? "Loading queue..." : 
           (pendingItems.length > 0 || approvedItems.length > 0 
             ? `${pendingItems.length} pending decisions · ${approvedItems.length} approved, awaiting dispatch.`
            : "Queue is clear. No incidents awaiting review or dispatch.")}
        </p>
        {aidAssessmentStatus && (
          <p className="mt-1 font-mono text-[10px] text-cyan-400" role="status" data-testid="status-regional-aid">
            {aidAssessmentStatus}
          </p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row relative">
        {/* Left Panel */}
        <div className="lg:w-[220px] xl:w-[320px] order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-border bg-muted/10 p-3 lg:p-4 xl:p-6 lg:overflow-y-auto flex flex-col gap-4 xl:gap-6 shrink-0 relative z-10 shadow-[2px_0_12px_rgba(0,0,0,0.2)]">
          <ContextPanel parish={parish} isLoading={isParishLoading} />
        </div>

        {/* Center Panel */}
        <div className="flex-1 min-w-0 order-1 lg:order-2 p-3 lg:p-4 xl:p-8 flex flex-col items-center justify-center lg:overflow-y-auto relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background shrink-0 lg:min-h-0 xl:min-h-[500px]">
          {!currentItem && !isItemsLoading ? (
            <div className="text-center animate-in fade-in zoom-in duration-500">
               <Check className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
               <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground font-bold">Command Queue Clear</p>
            </div>
          ) : currentItem ? (
            <div className="w-full max-w-xl mx-auto flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
              <ReviewCard 
                item={currentItem} 
                isDispatching={dispatching === currentItem.id} 
                isOptimisticallyApproved={justApprovedId === currentItem.id}
                dispatchForm={dispatchForm} 
                setDispatchForm={setDispatchForm}
                handleAction={handleAction}
                handleDispatch={handleDispatch}
                setDispatching={setDispatching}
                 isDeclining={decliningId === currentItem.id}
                 declineReason={declineReason}
                 setDeclineReason={setDeclineReason}
                 setDeclining={(declining) => {
                   setDecliningId(declining ? currentItem.id : null);
                   setDecisionError("");
                 }}
                 decisionError={decisionError}
                dispatchError={dispatchError}
                isPendingAction={updateItem.isPending}
                isPendingDispatch={dispatchTask.isPending}
              />
            </div>
          ) : null}
        </div>

        {/* Right Panel */}
        <div className="lg:w-[220px] xl:w-[320px] order-3 lg:order-3 border-t lg:border-t-0 lg:border-l border-border bg-muted/10 p-3 lg:p-4 xl:p-6 lg:overflow-y-auto flex flex-col gap-4 xl:gap-6 shrink-0 relative z-10 shadow-[-2px_0_12px_rgba(0,0,0,0.2)]">
          <LogisticsPanel resources={resources} isLoading={isResourcesLoading} parishName={parish?.name} />
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ 
  item, 
  isDispatching, 
  isOptimisticallyApproved,
  dispatchForm, 
  setDispatchForm, 
  handleAction, 
  handleDispatch, 
  setDispatching, 
  isDeclining,
  declineReason,
  setDeclineReason,
  setDeclining,
  decisionError,
  dispatchError, 
  isPendingAction, 
  isPendingDispatch 
}: {
  item: ReviewItem,
  isDispatching: boolean,
  isOptimisticallyApproved: boolean,
  dispatchForm: { officer: string, instructions: string },
  setDispatchForm: Dispatch<SetStateAction<{ officer: string, instructions: string }>>,
  handleAction: (id: number, status: 'approved' | 'rejected', reason?: string) => void,
  handleDispatch: (item: ReviewItem) => void,
  setDispatching: (id: number | null) => void,
  isDeclining: boolean,
  declineReason: string,
  setDeclineReason: (reason: string) => void,
  setDeclining: (declining: boolean) => void,
  decisionError: string,
  dispatchError: string,
  isPendingAction: boolean,
  isPendingDispatch: boolean
}) {
  const isApproved = item.status === 'approved' || isOptimisticallyApproved;
  
  return (
    <div className="bg-card border border-border shadow-2xl overflow-hidden flex flex-col rounded-sm ring-1 ring-white/5">
      <div className="p-4 md:p-5 xl:p-8 flex flex-col gap-5 xl:gap-6">
        <div className="flex items-center justify-between">
           <span className={cn(
             "font-mono text-[10px] px-2.5 py-1 rounded-[2px] border uppercase tracking-widest font-bold",
             item.type === 'infrastructure_alert' ? "bg-red-500/10 text-red-500 border-red-500/20" :
             item.type === 'evacuation_plan' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
             "bg-primary/10 text-primary border-primary/20"
           )}>
             {item.type.replace('_', ' ')}
           </span>
           <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1.5">
             <Clock className="w-3.5 h-3.5" />
             {new Date(item.createdAt).toLocaleString()}
           </span>
        </div>

        <div>
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-foreground leading-tight">{item.title}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground/90">{item.description}</p>
        </div>
        {item.metadata?.kind === "regional_aid_request" && <RegionalAidReviewDetails metadata={item.metadata} />}
        {item.metadata?.kind === "citizen_report" && (
          <div className="border border-amber-500/25 bg-amber-500/5 p-4 text-xs text-muted-foreground">
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber-300">Unverified citizen submission</div>
            <div className="mt-2">Reporter: {item.metadata.reporterName}</div>
            {item.metadata.location && <div>Location: {item.metadata.location}</div>}
            {item.metadata.photoObjectPath && (
              <a className="mt-2 inline-block text-primary hover:underline" href={`/api${item.metadata.photoObjectPath}`} target="_blank" rel="noreferrer">
                Review attached photo
              </a>
            )}
          </div>
        )}

        <div className="border-l-[3px] border-primary/40 pl-4 mt-2 bg-primary/5 py-3 pr-3 rounded-r-sm">
          <div className="font-mono text-[9px] uppercase tracking-widest text-primary font-bold">Location & Reference</div>
          <div className="mt-1.5 font-mono text-[11px] text-foreground uppercase tracking-wide">
             {item.parishName} · ID: {item.id.toString().padStart(6, '0')}
          </div>
        </div>
      </div>

      {item.status === 'pending' && !isDispatching && !isDeclining && (
        <div className="grid grid-cols-2 gap-px bg-border border-t border-border">
           <button
             onClick={() => handleAction(item.id, 'approved')}
             disabled={isPendingAction}
             data-testid={`button-approve-${item.id}`}
             className="bg-card hover:bg-green-500/10 text-green-500 transition-all p-6 md:p-8 flex flex-col items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-inner"
           >
             <Check className="w-10 h-10 group-hover:scale-110 transition-transform group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
             <span className="font-mono text-sm md:text-base uppercase tracking-widest font-bold">Approve</span>
           </button>
           <button
              onClick={() => setDeclining(true)}
             disabled={isPendingAction}
             data-testid={`button-reject-${item.id}`}
             className="bg-card hover:bg-red-500/10 text-red-500 transition-all p-6 md:p-8 flex flex-col items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-inner"
           >
             <X className="w-10 h-10 group-hover:scale-110 transition-transform group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
             <span className="font-mono text-sm md:text-base uppercase tracking-widest font-bold">Reject</span>
           </button>
        </div>
      )}

      {item.status === 'pending' && !isDispatching && isDeclining && (
        <div className="border-t border-red-500/30 bg-red-500/5 p-6 md:p-8 animate-in slide-in-from-top-2 fade-in duration-300" data-testid={`form-decline-${item.id}`}>
          <div className="font-mono text-[11px] uppercase tracking-widest text-red-500 flex items-center gap-2 mb-5 font-bold">
            <X className="w-4 h-4" />
            Decline Decision
          </div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-red-500/80 font-semibold" htmlFor={`decline-reason-${item.id}`}>
            Reason required
          </label>
          <textarea
            id={`decline-reason-${item.id}`}
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            placeholder="Document why this request cannot be approved."
            rows={4}
            autoFocus
            data-testid={`input-decline-reason-${item.id}`}
            className="mt-2 w-full bg-background/70 border border-red-500/30 rounded-sm px-4 py-3 text-sm text-foreground focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none"
          />
          {decisionError && (
            <div className="mt-3 font-mono text-[11px] text-red-500 bg-red-500/10 p-3 rounded-sm border border-red-500/20 font-medium" role="alert" data-testid={`status-decision-error-${item.id}`}>
              {decisionError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-5">
            <button
              onClick={() => setDeclining(false)}
              disabled={isPendingAction}
              data-testid={`button-cancel-decline-${item.id}`}
              className="h-11 px-6 border border-border bg-card hover:bg-muted/40 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors disabled:opacity-50 rounded-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction(item.id, 'rejected', declineReason)}
              disabled={!declineReason.trim() || isPendingAction}
              data-testid={`button-confirm-decline-${item.id}`}
              className="h-11 px-6 bg-red-500 text-white hover:bg-red-600 font-mono text-[11px] uppercase tracking-widest font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none rounded-sm"
            >
              {isPendingAction ? 'Recording...' : 'Confirm Decline'}
            </button>
          </div>
        </div>
      )}

      {isDispatching && isApproved && !item.metadata && (
        <div className="border-t border-primary/30 bg-primary/10 p-6 md:p-8 animate-in slide-in-from-top-2 fade-in duration-300 relative overflow-hidden" data-testid={`form-dispatch-${item.id}`}>
           <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
           <div className="font-mono text-[11px] uppercase tracking-widest text-primary flex items-center gap-2 mb-6 font-bold">
             <Send className="w-4 h-4" /> 
             Dispatch Task Authorization
           </div>

           <div className="space-y-5">
             <div className="flex flex-col gap-2">
               <label className="font-mono text-[10px] uppercase tracking-widest text-primary/70 font-semibold">Assign Field Officer</label>
               <select
                 value={dispatchForm.officer}
                 onChange={(e) => setDispatchForm(f => ({ ...f, officer: e.target.value }))}
                 data-testid={`select-officer-${item.id}`}
                 className="w-full bg-background/50 border border-primary/30 rounded-sm px-4 py-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
               >
                 <option value="">— Select Authorized Officer —</option>
                 {MOCK_OFFICERS.map(o => (
                   <option key={o.value} value={o.value}>{o.label}</option>
                 ))}
               </select>
             </div>

             <div className="flex flex-col gap-2">
               <label className="font-mono text-[10px] uppercase tracking-widest text-primary/70 font-semibold">Operational Instructions</label>
               <textarea
                 value={dispatchForm.instructions}
                 onChange={(e) => setDispatchForm(f => ({ ...f, instructions: e.target.value }))}
                 rows={3}
                 data-testid={`input-instructions-${item.id}`}
                 className="w-full bg-background/50 border border-primary/30 rounded-sm px-4 py-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none shadow-inner"
               />
             </div>

             {dispatchError && (
               <div className="font-mono text-[11px] text-red-500 bg-red-500/10 p-3 rounded-sm border border-red-500/20 font-medium" role="alert" data-testid={`status-dispatch-error-${item.id}`}>
                 {dispatchError}
               </div>
             )}

             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
               <button
                 onClick={() => handleDispatch(item)}
                 disabled={!dispatchForm.officer || isPendingDispatch}
                 data-testid={`button-dispatch-${item.id}`}
                 className="flex-1 flex items-center justify-center gap-2 h-12 bg-primary text-primary-foreground font-mono text-[11px] sm:text-xs uppercase tracking-widest font-bold transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-sm shadow-lg shadow-primary/20"
               >
                 {isPendingDispatch ? 'Dispatching...' : 'Execute Dispatch'}
               </button>
               <button
                 onClick={() => setDispatching(null)}
                 disabled={isPendingDispatch}
                 data-testid={`button-cancel-dispatch-${item.id}`}
                 className="sm:w-32 h-12 flex items-center justify-center border border-border bg-card hover:bg-muted/40 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-muted-foreground transition-colors disabled:opacity-50 rounded-sm"
               >
                 Cancel
               </button>
             </div>
           </div>
        </div>
      )}

      {!isDispatching && isApproved && (
        <div className="border-t border-border bg-card p-8 flex flex-col items-center justify-center gap-3 text-center">
           <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-2 shadow-[0_0_16px_rgba(34,197,94,0.15)]">
             <Check className="w-6 h-6" />
           </div>
           <h3 className="font-mono text-sm uppercase tracking-widest font-bold text-foreground">Incident Approved</h3>
           <p className="text-xs font-mono text-muted-foreground">Authorized by {item.reviewedBy ?? 'Command'}</p>
           
            {item.metadata ? (
              <p className="mt-3 max-w-md text-xs font-mono leading-relaxed text-muted-foreground">
                A requested mutual-aid record was added to Unified Command. Official counterpart confirmation is still required before resources are committed.
              </p>
            ) : (
              <button
                onClick={() => setDispatching(item.id)}
                data-testid={`button-initiate-dispatch-${item.id}`}
                className="mt-6 flex items-center justify-center gap-2 h-11 px-8 border border-primary text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground font-mono text-xs uppercase tracking-widest font-bold transition-all rounded-sm hover:shadow-[0_0_20px_rgba(var(--primary),0.15)]"
              >
                <Send className="w-4 h-4" />
                Initiate Dispatch
              </button>
            )}
        </div>
      )}
    </div>
  );
}

function ContextPanel({ parish, isLoading }: { parish?: ParishDetail, isLoading: boolean }) {
  if (isLoading || !parish) {
    return <div className="animate-pulse space-y-4">
       <div className="h-4 bg-muted/50 w-24 rounded-sm" />
       <div className="h-24 bg-muted/50 w-full rounded-sm" />
       <div className="h-20 bg-muted/50 w-full rounded-sm" />
    </div>;
  }

  const isCritical = parish.readinessLevel === 'Critical';
  const isAtRisk = parish.readinessLevel === 'At risk';
  const colorClass = isCritical ? 'text-red-500' : isAtRisk ? 'text-amber-500' : 'text-green-500';
  const bgClass = isCritical ? 'bg-red-500/10' : isAtRisk ? 'bg-amber-500/10' : 'bg-green-500/10';
  const borderClass = isCritical ? 'border-red-500/30' : isAtRisk ? 'border-amber-500/30' : 'border-green-500/30';
  
  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500" data-testid="section-context-parish">
      <div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" /> Area Context
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground">{parish.name}</h2>
      </div>

      <div className={cn("p-5 border rounded-sm relative overflow-hidden shadow-inner", bgClass, borderClass)}>
        <div className={cn("absolute top-0 left-0 w-1 h-full", isCritical ? 'bg-red-500' : isAtRisk ? 'bg-amber-500' : 'bg-green-500')} />
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Readiness Score
        </div>
        <div className="flex items-baseline gap-2">
           <span className={cn("font-mono text-5xl font-bold tracking-tighter", colorClass)} data-testid="value-context-readiness">{parish.readinessScore}</span>
          <span className="font-mono text-sm text-muted-foreground">/100</span>
        </div>
        <div className={cn("mt-4 inline-flex px-2.5 py-1 border font-mono text-[10px] uppercase tracking-widest font-bold rounded-sm shadow-sm", colorClass, borderClass, "bg-background")}>
          {parish.readinessLevel}
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-primary" /> Top Risk Bottleneck
        </div>
         <div className="text-sm leading-relaxed text-foreground border-l-[3px] border-primary/50 pl-4 py-1" data-testid="text-context-bottleneck">
          {parish.bottleneck}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
        <div>
           <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Population</div>
           <div className="font-mono text-sm text-foreground mt-1.5 font-medium">{parish.population.toLocaleString()}</div>
        </div>
        <div>
           <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Area (km²)</div>
           <div className="font-mono text-sm text-foreground mt-1.5 font-medium">{parish.area}</div>
        </div>
      </div>
    </div>
  );
}

function LogisticsPanel({ resources, isLoading, parishName }: { resources?: ResourceOperationalStatus[], isLoading: boolean, parishName?: string }) {
  if (isLoading) {
    return <div className="animate-pulse space-y-4">
       <div className="h-4 bg-muted/50 w-24 rounded-sm" />
       <div className="h-24 bg-muted/50 w-full rounded-sm" />
       <div className="h-24 bg-muted/50 w-full rounded-sm" />
    </div>;
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="flex flex-col gap-3 text-muted-foreground">
        <div className="font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
          <Package className="w-3.5 h-3.5 text-primary" /> Logistics Availability
        </div>
        <div className="font-mono text-xs border border-border/50 bg-background/50 p-4 rounded-sm">No logistics data currently verified for {parishName}.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
        <Package className="w-3.5 h-3.5 text-primary" /> Logistics Availability
      </div>
      
      <div className="flex flex-col gap-4">
        {resources.map((res) => {
          const isShortfall = res.operationalStatus === 'shortfall';
          const isSufficient = res.operationalStatus === 'sufficient';
          const toneClass = isShortfall ? 'text-red-500' : isSufficient ? 'text-green-500' : 'text-amber-500';
          const bgClass = isShortfall ? 'bg-red-500/5' : isSufficient ? 'bg-green-500/5' : 'bg-amber-500/5';
          const borderClass = isShortfall ? 'border-red-500/30' : isSufficient ? 'border-green-500/30' : 'border-amber-500/30';

          return (
            <div key={`${res.resourceType}-${res.unit}`} className={cn("border rounded-sm p-4 flex flex-col gap-3 shadow-sm", bgClass, borderClass)}>
               <div className="flex items-center justify-between gap-2">
                 <span className="font-mono text-[11px] uppercase tracking-widest text-foreground font-bold truncate">
                   {res.resourceType.replace('_', ' ')}
                 </span>
                 <span className={cn("font-mono text-[9px] uppercase tracking-widest px-2 py-1 border rounded-sm shrink-0", toneClass, borderClass, "bg-background font-bold")}>
                   {res.operationalStatus}
                 </span>
               </div>
               
               <div className="grid grid-cols-2 gap-3 mt-1 p-3 bg-background/60 border border-border/50 rounded-sm">
                 <div>
                    <div className="font-mono text-[9px] uppercase text-muted-foreground/80 mb-1">Partner declared</div>
                    <div className="font-mono text-sm font-bold text-primary">
                      {res.declaredQuantity.toLocaleString()} <span className="text-[10px] font-normal opacity-80">{res.unit}</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] uppercase text-muted-foreground/80 mb-1">Verified available</div>
                    <div className={cn("font-mono text-sm font-bold", toneClass)} data-testid={`value-verified-${res.resourceType}-${res.unit}`}>
                     {res.verifiedAvailableQuantity?.toLocaleString() ?? 0} <span className="text-[10px] font-normal opacity-80">{res.unit}</span>
                   </div>
                 </div>
                 <div>
                    <div className="font-mono text-[9px] uppercase text-muted-foreground/80 mb-1">Deployed</div>
                    <div className="font-mono text-sm text-blue-400 font-medium">
                      {res.deployedQuantity?.toLocaleString() ?? 0} <span className="text-[10px] font-normal text-muted-foreground">{res.unit}</span>
                    </div>
                  </div>
                  <div>
                   <div className="font-mono text-[9px] uppercase text-muted-foreground/80 mb-1">Target</div>
                   <div className="font-mono text-sm text-foreground font-medium">
                     {res.targetQuantity?.toLocaleString() ?? 0} <span className="text-[10px] font-normal text-muted-foreground">{res.unit}</span>
                   </div>
                 </div>
               </div>
               
               {isShortfall && res.shortfallQuantity != null && (
                 <div className="mt-1 font-mono text-[10px] uppercase text-red-500 flex items-center gap-1.5 font-bold">
                   <AlertTriangle className="w-3.5 h-3.5" /> Shortfall: {res.shortfallQuantity.toLocaleString()}
                 </div>
               )}
                {res.resourceType === 'fuel' && res.operationalEvidenceNote && (
                  <div className="border-l-2 border-red-500/40 pl-3 font-mono text-[10px] leading-relaxed text-muted-foreground" data-testid="text-fuel-evidence">
                    {res.operationalEvidenceNote}
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
