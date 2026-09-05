import {
  UnifiedCommandWorkspace,
  getGetUnifiedCommandWorkspaceQueryKey,
  useApplyUnifiedCommandAction,
} from "@workspace/api-client-react";
import { Truck, Plus, Building2, ShieldCheck, Bot, AlertTriangle, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { ActionDialog } from "../forms/ActionDialog";
import { useRole } from "@/contexts/RoleContext";
import { useQueryClient } from "@tanstack/react-query";

export function LogisticsSection({ workspace }: { workspace: UnifiedCommandWorkspace }) {
  const { role } = useRole();
  const queryClient = useQueryClient();
  const canCoordinate = workspace.capabilities.includes('coordinate');
  const canConfirmCounterpart = workspace.currentActor.role === "national_coordinator";
  const activeNotificationChannels = workspace.notificationChannels.filter((channel) =>
    channel.approved && channel.status === "active");
  const [notificationChannelId, setNotificationChannelId] = useState(
    workspace.aidExpirationNotificationChannelId ?? activeNotificationChannels[0]?.id ?? "",
  );
  const [notificationMessage, setNotificationMessage] = useState("");
  const configureNotifications = useApplyUnifiedCommandAction({
  });
  const [createAidOpen, setCreateAidOpen] = useState(false);
  const [editAid, setEditAid] = useState<any>(null);
  const [confirmAid, setConfirmAid] = useState<any>(null);
  const [editAgency, setEditAgency] = useState<any>(null);

  useEffect(() => {
    setNotificationChannelId(
      workspace.aidExpirationNotificationChannelId ?? activeNotificationChannels[0]?.id ?? "",
    );
  }, [workspace.aidExpirationNotificationChannelId, workspace.notificationChannels]);

  const saveNotificationChannel = () => {
    if (!notificationChannelId) return;
    setNotificationMessage("");
    configureNotifications.mutate({
      workspaceId: workspace.id,
      data: {
        type: "configure_aid_expiration_notifications",
        notificationChannelId,
      },
    }, {
      onSuccess: () => {
        setNotificationMessage("Approved destination saved.");
        queryClient.invalidateQueries({ queryKey: getGetUnifiedCommandWorkspaceQueryKey(workspace.id) });
      },
      onError: (error) => {
        const message = error && typeof error === "object"
          ? (error as { data?: { error?: string } }).data?.error
          : null;
        setNotificationMessage(message || "The notification destination could not be saved.");
      },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Mutual Aid */}
      <div className="flex flex-col h-full rounded-md border border-border bg-card/30">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <h2 className="font-mono text-xs uppercase tracking-wider font-semibold">Mutual Aid Requests</h2>
          </div>
          {canCoordinate && (
            <Button variant="ghost" size="sm" onClick={() => setCreateAidOpen(true)} className="h-7 px-2 font-mono text-[10px] uppercase">
              <Plus className="h-3 w-3 mr-1" /> Request
            </Button>
          )}
        </div>
        {canConfirmCounterpart && (
          <div data-testid="aid-expiration-notification-settings" className="mx-3 mt-3 border border-border bg-background/70 p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary">
              <RadioTower className="h-3.5 w-3.5" />
              Expiration alert destination
            </div>
            {activeNotificationChannels.length > 0 ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  aria-label="Approved aid-expiration notification destination"
                  data-testid="aid-expiration-notification-channel"
                  value={notificationChannelId}
                  onChange={(event) => setNotificationChannelId(event.target.value)}
                  className="h-8 flex-1 rounded-sm border border-input bg-background px-2 font-mono text-[10px]"
                >
                  {activeNotificationChannels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.label} · {channel.kind}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="save-aid-expiration-notification-channel"
                  disabled={!notificationChannelId || configureNotifications.isPending}
                  onClick={saveNotificationChannel}
                  className="h-8 font-mono text-[9px] uppercase"
                >
                  {configureNotifications.isPending ? "Saving..." : "Use channel"}
                </Button>
              </div>
            ) : (
              <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                No approved active command destination is available.
              </div>
            )}
            {notificationMessage && (
              <div role="status" className="mt-2 font-mono text-[9px] text-muted-foreground">
                {notificationMessage}
              </div>
            )}
          </div>
        )}
        {workspace.expirationWarnings.length > 0 && (
          <div
            role="alert"
            data-testid="aid-expiration-warnings"
            className="mx-3 mt-3 border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Aid confirmations nearing expiration
            </div>
            <div className="mt-2 space-y-2">
              {workspace.expirationWarnings.map((warning) => (
                <div key={warning.aidId} data-testid={`aid-expiration-warning-${warning.aidId}`} className="border-t border-amber-500/20 pt-2 font-mono text-[10px]">
                  <div className="font-semibold text-amber-100">{warning.provider}</div>
                  <div className="mt-0.5 text-amber-200/90">Reference: {warning.reference}</div>
                  <div className="mt-0.5 text-amber-100/80">
                    Validity remaining: {formatRemainingWindow(warning.remainingMs)} · expires {new Date(warning.expiresAt).toLocaleString()}
                  </div>
                  {canConfirmCounterpart && (() => {
                    const delivery = workspace.notificationDeliveries.find((item) => item.warningKey === warning.warningKey);
                    const channel = workspace.notificationChannels.find((item) => item.id === delivery?.destinationId);
                    if (!delivery) {
                      return (
                        <div className="mt-1 text-amber-200/70">
                          External alert pending an approved destination.
                        </div>
                      );
                    }
                    return (
                      <div
                        data-testid={`aid-expiration-delivery-${warning.aidId}`}
                        className={delivery.status === "delivered"
                          ? "mt-1 text-green-300"
                          : delivery.status === "pending" || delivery.status === "unknown"
                            ? "mt-1 text-amber-200/70"
                            : "mt-1 text-red-300"}
                      >
                        {delivery.status === "delivered"
                          ? "Delivered"
                          : delivery.status === "pending"
                            ? "Sending"
                            : delivery.status === "unknown" ? "Delivery outcome unknown" : "Delivery failed"}
                        {channel ? ` · ${channel.label}` : ""}
                        {delivery.deliveredAt ? ` · ${new Date(delivery.deliveredAt).toLocaleString()}` : ""}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {workspace.mutualAid.length === 0 ? (
            <div className="text-center font-mono text-xs text-muted-foreground py-8">No active mutual aid records.</div>
          ) : (
            workspace.mutualAid.map(aid => {
              const isAiPlanningAid = aid.id.startsWith("ai-aid-");
              const confirmation = aid.confirmation;
              const requestedQuantity = aid.requestedQuantity ?? aid.quantity;
              const confirmationIsCurrent = confirmation
                && (confirmation.status === "accepted" || confirmation.status === "partial")
                && (!confirmation.expiresAt || new Date(confirmation.expiresAt).getTime() > Date.now());
              return (
              <div
                key={aid.id}
                data-testid={`aid-record-${aid.id}`}
                className={`border border-border bg-background p-3 rounded-sm flex flex-col gap-2 transition-colors ${canCoordinate ? 'hover:border-primary/50 cursor-pointer' : ''}`}
                onClick={() => canCoordinate && setEditAid(aid)}
              >
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-sm">
                    {confirmation && confirmation.status !== "rejected"
                      ? `${aid.quantity} of ${requestedQuantity}`
                      : requestedQuantity} {aid.unit} {aid.resource}
                  </div>
                  <Badge variant="outline" className={`font-mono text-[9px] uppercase shrink-0 ${aid.status === 'delivered' ? 'text-green-500 border-green-500/20' : aid.status === 'cancelled' ? 'text-red-500 border-red-500/20' : 'text-primary border-primary/20'}`}>
                    {aid.status}
                  </Badge>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground grid grid-cols-2 gap-1 mt-1">
                  <div className="truncate">REQ: {aid.requester}</div>
                  <div className="truncate">
                    {isAiPlanningAid ? `CONFIRMED: ${confirmation?.provider ?? "none"}` : `PROV: ${aid.provider}`}
                  </div>
                  <div className="col-span-2 text-primary/70 truncate">DEST: {aid.destination}</div>
                </div>
                {isAiPlanningAid && (
                  <div className="grid gap-2 border-t border-border/50 pt-2">
                    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-cyan-400">
                      <Bot className="h-3 w-3" />
                      Planning candidates — not confirmed
                    </div>
                    <div className="text-[10px] leading-relaxed text-muted-foreground">
                      {aid.planningCandidates?.length
                        ? aid.planningCandidates.map((candidate) => candidate.name).join(", ")
                        : "No structured candidate list is available for this earlier planning record."}
                    </div>
                    {confirmation && (
                      <div
                        className={`border p-2 font-mono text-[9px] leading-relaxed ${confirmationIsCurrent ? "border-green-500/25 bg-green-500/5 text-green-300" : "border-amber-500/25 bg-amber-500/5 text-amber-300"}`}
                        data-testid="aid-confirmation-evidence"
                      >
                        <div className="flex items-center gap-1.5 uppercase tracking-wider">
                          <ShieldCheck className="h-3 w-3" />
                          Official response · {confirmation.status}
                        </div>
                        <div className="mt-1 text-foreground/80">
                          {confirmation.provider} accepted {confirmation.acceptedQuantity} {aid.unit}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {confirmation.reference} · {confirmation.source} · {new Date(confirmation.confirmedAt).toLocaleString()}
                          {confirmation.expiresAt ? ` · expires ${new Date(confirmation.expiresAt).toLocaleString()}` : ""}
                        </div>
                      </div>
                    )}
                    {canConfirmCounterpart && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 justify-center border-green-500/30 bg-green-500/5 font-mono text-[9px] uppercase text-green-400 hover:bg-green-500/10 hover:text-green-300"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConfirmAid(aid);
                        }}
                      >
                        <ShieldCheck className="mr-1.5 h-3 w-3" />
                        {confirmation ? "Update official response" : "Record verified acceptance"}
                      </Button>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50 font-mono text-[9px] uppercase">
                  <span>APPROVAL: <span className={aid.approval === 'approved' ? 'text-green-500' : 'text-amber-500'}>{aid.approval}</span></span>
                  {aid.eta && <span>ETA: {aid.eta}</span>}
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* External Agencies */}
      <div className="flex flex-col h-full rounded-md border border-border bg-card/30">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-xs uppercase tracking-wider font-semibold">External Agencies Check-in</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {workspace.externalAgencies.length === 0 ? (
            <div className="text-center font-mono text-xs text-muted-foreground py-8">No external agencies recorded.</div>
          ) : (
            workspace.externalAgencies.map(agency => (
              <div key={agency.id} className={`border border-border bg-background p-3 rounded-sm flex flex-col gap-2 transition-colors ${canCoordinate ? 'hover:border-primary/50 cursor-pointer' : ''}`} onClick={() => canCoordinate && setEditAgency(agency)}>
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-sm">{agency.agency}</div>
                  <Badge variant="outline" className={`font-mono text-[9px] uppercase shrink-0 ${agency.status === 'active' ? 'text-green-500 border-green-500/20' : 'text-muted-foreground'}`}>
                    {agency.status}
                  </Badge>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1 space-y-1">
                  <div>CAPACITY: {agency.capacity}</div>
                  <div>NEEDS: {agency.needs}</div>
                  <div className="text-primary/70">LOC: {agency.location}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ActionDialog
        workspaceId={workspace.id} open={createAidOpen} onOpenChange={setCreateAidOpen} type="create_aid" title="Request Mutual Aid"
        fields={[
          { name: "requester", label: "Requester", type: "text", required: true },
          { name: "provider", label: "Provider", type: "text", required: true },
          { name: "resource", label: "Resource", type: "text", required: true },
          { name: "quantity", label: "Quantity", type: "number", required: true },
          { name: "unit", label: "Unit", type: "text", required: true },
          { name: "destination", label: "Destination", type: "text", required: true }
        ]}
      />

      {editAid && (
        <ActionDialog
          workspaceId={workspace.id} open={!!editAid} onOpenChange={(v) => !v && setEditAid(null)} type="update_aid" initialData={editAid} title="Update Aid Status"
          fields={[
            { name: "status", label: "Status", type: "select", options: editAid.id?.startsWith("ai-aid-") && !hasCurrentConfirmation(editAid) ? ["requested", "cancelled"] : ["requested", "committed", "en_route", "delivered", "cancelled"], required: true },
            { name: "approval", label: "Approval", type: "select", options: editAid.id?.startsWith("ai-aid-") && !hasCurrentConfirmation(editAid) ? ["pending", "declined"] : ["pending", "approved", "declined"], required: true },
            { name: "eta", label: "ETA", type: "text" }
          ]}
        />
      )}

      {confirmAid && (
        <ActionDialog
          workspaceId={workspace.id}
          open={!!confirmAid}
          onOpenChange={(open) => !open && setConfirmAid(null)}
          type="confirm_aid"
          initialData={{ id: confirmAid.id }}
          title="Record Official Counterpart Response"
          fields={[
            { name: "confirmationReference", label: "Official confirmation reference", type: "text", required: true },
            { name: "confirmationSource", label: "Source / channel", type: "text", required: true },
            { name: "confirmationTimestamp", label: "Counterpart response time", type: "datetime-local", required: true, defaultValue: toLocalDateTimeInput(new Date()) },
            { name: "confirmationProvider", label: "Confirmed provider", type: "text", required: true, defaultValue: confirmAid.confirmation?.provider ?? "" },
            { name: "acceptedQuantity", label: `Accepted quantity (requested ${confirmAid.requestedQuantity ?? confirmAid.quantity})`, type: "number", required: true, defaultValue: confirmAid.confirmation?.acceptedQuantity ?? confirmAid.requestedQuantity ?? confirmAid.quantity, min: 0, max: confirmAid.requestedQuantity ?? confirmAid.quantity, step: 1 },
            { name: "confirmationExpiresAt", label: "Evidence expires (optional)", type: "datetime-local" },
            { name: "status", label: "Operational state after acceptance", type: "select", options: ["committed", "requested"], defaultValue: "committed", required: true },
          ]}
        />
      )}

      {editAgency && (
        <ActionDialog
          workspaceId={workspace.id} open={!!editAgency} onOpenChange={(v) => !v && setEditAgency(null)} type="update_agency" initialData={editAgency} title={`Update ${editAgency.agency}`}
          fields={[
            { name: "status", label: "Status", type: "select", options: ["requested", "active", "standby", "offline", "unverified"], required: true },
            { name: "capacity", label: "Capacity", type: "text" },
            { name: "needs", label: "Needs", type: "text" },
            { name: "location", label: "Location", type: "text" },
            { name: "verificationStatus", label: "Verification", type: "select", options: ["verified", "stale", "unverified"] }
          ]}
        />
      )}
    </div>
  );
}

function hasCurrentConfirmation(aid: any) {
  const confirmation = aid.confirmation;
  return Boolean(
    confirmation
    && (confirmation.status === "accepted" || confirmation.status === "partial")
    && (!confirmation.expiresAt || new Date(confirmation.expiresAt).getTime() > Date.now()),
  );
}

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatRemainingWindow(remainingMs: number) {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  return `${minutes}m`;
}