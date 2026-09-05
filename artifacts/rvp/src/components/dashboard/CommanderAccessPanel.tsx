import { useState } from "react";
import {
  getGetUnifiedCommandWorkspaceQueryKey,
  useApplyUnifiedCommandAction,
  useListParishes,
} from "@workspace/api-client-react";
import { MailPlus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/contexts/RoleContext";
import { useQueryClient } from "@tanstack/react-query";

function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const data = (error as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  return "The demo invitation could not be created. Please try again.";
}

const ROLE_OPTIONS = [
  { value: "parish_manager", label: "Ops Section Chief" },
  { value: "field_officer", label: "Field Officer" },
] as const;

const AGENCY_OPTIONS = [
  "National Disaster Risk Management Council",
  "Jamaica Defence Force",
  "Jamaica Constabulary Force",
  "Jamaica Fire Brigade",
  "Ministry of Health & Wellness",
  "Parish Council",
  "National Works Agency",
  "Jamaica Red Cross",
] as const;

const ICS_FUNCTION_OPTIONS = [
  "Command",
  "Operations",
  "Planning",
  "Logistics",
  "Finance",
] as const;

const CONTACT_CHANNEL_OPTIONS = ["Email", "Radio", "Phone", "Satellite"] as const;

export default function CommanderAccessPanel({ role, workspaceId }: { role: Role; workspaceId: string }) {
  const queryClient = useQueryClient();
  const { data: parishes, isLoading: isParishesLoading } = useListParishes();
  const request = {};
  const applyAction = useApplyUnifiedCommandAction({ request });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleValue, setRoleValue] = useState<"parish_manager" | "field_officer">("parish_manager");
  const [agency, setAgency] = useState("");
  const [icsFunction, setIcsFunction] = useState("Operations");
  const [contactChannel, setContactChannel] = useState("Email");
  const [parishId, setParishId] = useState("st-elizabeth");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (role !== "national_coordinator") return null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    if (!name.trim()) {
      setFormError("Enter the member name before sending the invitation.");
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError("Enter a valid email address before sending the invitation.");
      return;
    }
    if (!parishId) {
      setFormError("Select the parish this member will cover.");
      return;
    }
    if (!agency) {
      setFormError("Select the member's agency.");
      return;
    }
    applyAction.mutate(
      {
        workspaceId,
        data: {
          type: "invite_member",
          email: normalizedEmail,
          name: name.trim(),
          role: roleValue,
          roleTitle: ROLE_OPTIONS.find((option) => option.value === roleValue)?.label ?? "Field Officer",
          agency,
          icsFunction,
          contactChannel,
          scope: parishes?.find((parish) => parish.id === parishId)?.name ?? parishId,
        },
      },
      {
        onSuccess: () => {
          setName("");
          setEmail("");
          setSuccessMessage(
            `Member added to the ${parishes?.find((parish) => parish.id === parishId)?.name ?? parishId} command roster. No email was sent.`,
          );
          queryClient.invalidateQueries({ queryKey: getGetUnifiedCommandWorkspaceQueryKey(workspaceId) });
        },
        onError: (error) => setFormError(getApiErrorMessage(error)),
      },
    );
  };

  return (
    <section
      className="border-b border-border bg-card/30 px-4 py-4 lg:px-6"
      data-testid="section-commander-access"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary">
              <ShieldCheck className="h-4 w-4" />
              Operator access
            </div>
            <h2 className="mt-1 text-sm font-bold uppercase tracking-tight text-foreground">
              Invite command member
            </h2>
            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
              Select the member's role, agency, ICS function, contact channel, and parish scope before they join the response workspace.
              This preview uses simulated invitations; no email is sent.
            </p>
          </div>
          <span className="border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[8px] uppercase tracking-widest text-primary">
            Incident Commander only
          </span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-3 border border-border/70 bg-background/30 p-3 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="form-operator-invitation"
        >
          <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Member name
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Alicia Morgan"
              autoComplete="name"
              className="h-9 border border-border bg-background px-3 font-sans text-xs normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              data-testid="input-operator-invitation-name"
            />
          </label>
          <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Invitee email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ops-chief@example.org"
              autoComplete="email"
              className="h-9 border border-border bg-background px-3 font-sans text-xs normal-case tracking-normal text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              data-testid="input-operator-invitation-email"
            />
          </label>
          <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Role title
            <select
              value={roleValue}
              onChange={(event) => setRoleValue(event.target.value as "parish_manager" | "field_officer")}
              className="h-9 border border-border bg-background px-3 text-[10px] uppercase text-foreground outline-none transition-colors focus:border-primary"
              data-testid="select-operator-invitation-role"
            >
              {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Agency
            <select
              required
              value={agency}
              onChange={(event) => setAgency(event.target.value)}
              className="h-9 border border-border bg-background px-3 text-[10px] uppercase text-foreground outline-none transition-colors focus:border-primary"
              data-testid="select-operator-invitation-agency"
            >
              <option value="">Select agency</option>
              {AGENCY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            ICS function
            <select
              value={icsFunction}
              onChange={(event) => setIcsFunction(event.target.value)}
              className="h-9 border border-border bg-background px-3 text-[10px] uppercase text-foreground outline-none transition-colors focus:border-primary"
              data-testid="select-operator-invitation-ics-function"
            >
              {ICS_FUNCTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Contact channel
            <select
              value={contactChannel}
              onChange={(event) => setContactChannel(event.target.value)}
              className="h-9 border border-border bg-background px-3 text-[10px] uppercase text-foreground outline-none transition-colors focus:border-primary"
              data-testid="select-operator-invitation-contact-channel"
            >
              {CONTACT_CHANNEL_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Geographic scope
            <select
              value={parishId}
              onChange={(event) => setParishId(event.target.value)}
              disabled={isParishesLoading}
              className="h-9 border border-border bg-background px-3 text-[10px] uppercase text-foreground outline-none transition-colors focus:border-primary disabled:opacity-60"
              data-testid="select-operator-invitation-parish"
            >
              <option value="">Select parish</option>
              {parishes?.map((parish) => (
                <option key={parish.id} value={parish.id}>
                  {parish.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
             disabled={applyAction.isPending || isParishesLoading}
            className="flex h-9 items-center justify-center gap-2 self-end border border-primary/30 bg-primary px-4 font-mono text-[9px] uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 lg:col-span-1"
            data-testid="button-send-operator-invitation"
          >
            <MailPlus className="h-3.5 w-3.5" />
             {applyAction.isPending ? "Adding to roster…" : "Add to command roster"}
          </button>
        </form>

        {(formError || successMessage) && (
          <p
            role={formError ? "alert" : "status"}
            className={cn(
              "border px-3 py-2 font-mono text-[10px]",
              formError
                ? "border-red-500/30 bg-red-500/10 text-red-500"
                : "border-green-500/30 bg-green-500/10 text-green-500",
            )}
            data-testid={formError ? "status-operator-invitation-error" : "status-operator-invitation-success"}
          >
            {formError || successMessage}
          </p>
        )}

        <div className="border border-dashed border-border/70 px-3 py-3 font-mono text-[10px] uppercase text-muted-foreground">
          New invitees appear in the Command Roster below after they are added.
        </div>
      </div>
    </section>
  );
}