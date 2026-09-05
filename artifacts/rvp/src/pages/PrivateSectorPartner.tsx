import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import {
  useDeclareResources,
  useListResourceDeclarations,
  getGetParishInfrastructureQueryKey,
  getListResourceDeclarationsQueryKey,
  getGetResourceSummaryQueryKey,
} from "@workspace/api-client-react";
import type { InfrastructureCategory, ResourceItem, ResourceDeclarationInput } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_TYPES: { value: string; label: string }[] = [
  { value: "logistics_transport", label: "Logistics & Transport" },
  { value: "hotel_hospitality", label: "Hotel & Hospitality" },
  { value: "food_retail", label: "Food & Retail" },
  { value: "fuel_energy", label: "Fuel & Energy" },
  { value: "medical_pharmacy", label: "Medical & Pharmacy" },
  { value: "construction_equipment", label: "Construction & Equipment" },
  { value: "fishing_maritime", label: "Fishing & Maritime" },
  { value: "financial_banking", label: "Financial & Banking" },
  { value: "ngo_faith", label: "NGO & Faith Community" },
  { value: "other", label: "Other" },
];

const ORG_TYPE_MAP: Record<string, string> = Object.fromEntries(
  ORG_TYPES.map(({ value, label }) => [value, label])
);

const PARISHES: { value: string; label: string }[] = [
  { value: "kingston", label: "Kingston" },
  { value: "st-andrew", label: "St. Andrew" },
  { value: "st-thomas", label: "St. Thomas" },
  { value: "portland", label: "Portland" },
  { value: "st-mary", label: "St. Mary" },
  { value: "st-ann", label: "St. Ann" },
  { value: "trelawny", label: "Trelawny" },
  { value: "st-james", label: "St. James" },
  { value: "hanover", label: "Hanover" },
  { value: "westmoreland", label: "Westmoreland" },
  { value: "st-elizabeth", label: "St. Elizabeth" },
  { value: "manchester", label: "Manchester" },
  { value: "clarendon", label: "Clarendon" },
  { value: "st-catherine", label: "St. Catherine" },
];

const RESOURCE_TYPES: { value: string; label: string }[] = [
  { value: "fuel", label: "Fuel" },
  { value: "food_water", label: "Food & Water" },
  { value: "shelter_beds", label: "Shelter Beds" },
  { value: "vehicles", label: "Vehicles & Trucks" },
  { value: "boats", label: "Boats & Vessels" },
  { value: "medical_supplies", label: "Medical Supplies" },
  { value: "generators", label: "Generators" },
  { value: "communications", label: "Communications Equipment" },
  { value: "personnel", label: "Personnel & Volunteers" },
  { value: "warehouse", label: "Warehouse Space" },
  { value: "cash_funding", label: "Cash Funding" },
];

const FACILITY_CATEGORIES: { value: InfrastructureCategory; label: string }[] = [
  { value: "hotel", label: "Hotel & Hospitality" },
  { value: "bank", label: "Bank & Financial Services" },
  { value: "church_faith", label: "Church & Faith Facility" },
  { value: "fuel", label: "Fuel & Energy" },
  { value: "medical", label: "Medical & Pharmacy" },
  { value: "food", label: "Food & Retail" },
  { value: "shelter", label: "Shelter & Accommodation" },
  { value: "logistics", label: "Logistics & Transport" },
  { value: "other", label: "Other Essential Service" },
];

const FACILITY_CATEGORY_MAP: Record<InfrastructureCategory, string> = Object.fromEntries(
  FACILITY_CATEGORIES.map(({ value, label }) => [value, label])
) as Record<InfrastructureCategory, string>;

const AVAILABILITY_OPTIONS: { value: ResourceItem["availabilityWindow"]; label: string }[] = [
  { value: "immediately", label: "Immediately" },
  { value: "within_6h", label: "Within 6 Hours" },
  { value: "within_24h", label: "Within 24 Hours" },
  { value: "within_48h", label: "Within 48 Hours" },
];

const AVAILABILITY_LABELS: Record<ResourceItem["availabilityWindow"], string> = {
  immediately: "Immediately",
  within_6h: "Within 6h",
  within_24h: "Within 24h",
  within_48h: "Within 48h",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyRow(): ResourceItem {
  return { resourceType: "", quantity: 0, unit: "", availabilityWindow: "immediately" };
}

function relativeTime(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls =
  "h-8 bg-background border border-border text-foreground font-mono text-xs px-2 rounded-sm focus:outline-none focus:border-primary/60 focus:ring-0 w-full uppercase placeholder:normal-case placeholder:text-muted-foreground/50";

const selectCls =
  "h-8 bg-background border border-border text-foreground font-mono text-xs px-2 rounded-sm focus:outline-none focus:border-primary/60 w-full uppercase";

function ResourceRow({
  row,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  row: ResourceItem;
  index: number;
  canRemove: boolean;
  onChange: (index: number, updated: ResourceItem) => void;
  onRemove: (index: number) => void;
}) {
  function update(patch: Partial<ResourceItem>) {
    onChange(index, { ...row, ...patch });
  }

  return (
    <div className="grid grid-cols-[1fr_80px_1fr_1fr_32px] gap-2 items-center">
      {/* Resource type */}
      <select
        value={row.resourceType}
        onChange={(e) => update({ resourceType: e.target.value })}
        className={selectCls}
      >
        <option value="" disabled>Resource Type</option>
        {RESOURCE_TYPES.map((rt) => (
          <option key={rt.value} value={rt.value}>{rt.label}</option>
        ))}
      </select>

      {/* Quantity */}
      <input
        type="number"
        min={0}
        value={row.quantity || ""}
        onChange={(e) => update({ quantity: Number(e.target.value) })}
        className={inputCls}
        placeholder="Qty"
      />

      {/* Unit */}
      <input
        type="text"
        value={row.unit}
        onChange={(e) => update({ unit: e.target.value })}
        className={inputCls}
        placeholder="litres / meals / beds / vehicles…"
      />

      {/* Availability */}
      <select
        value={row.availabilityWindow}
        onChange={(e) =>
          update({ availabilityWindow: e.target.value as ResourceItem["availabilityWindow"] })
        }
        className={selectCls}
      >
        {AVAILABILITY_OPTIONS.map((a) => (
          <option key={a.value} value={a.value}>{a.label}</option>
        ))}
      </select>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className={cn(
          "flex items-center justify-center h-8 w-8 rounded-sm border border-border transition-colors",
          canRemove
            ? "text-muted-foreground hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10"
            : "text-muted-foreground/20 border-border/30 cursor-not-allowed"
        )}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Declaration Form ─────────────────────────────────────────────────────────

function DeclarationForm() {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useDeclareResources();

  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [parishId, setParishId] = useState("");
  const [facilityCategory, setFacilityCategory] = useState<InfrastructureCategory | "">("");
  const [location, setLocation] = useState("");
  const [resources, setResources] = useState<ResourceItem[]>([emptyRow()]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function updateRow(index: number, updated: ResourceItem) {
    setResources((prev) => prev.map((r, i) => (i === index ? updated : r)));
  }

  function addRow() {
    setResources((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setResources((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const validResources = resources.filter(
      (r) => r.resourceType && r.quantity > 0 && r.unit.trim()
    );
    if (!facilityCategory || !location.trim() || validResources.length === 0) {
      setErrorMsg("Add a facility category, location, and at least one complete resource.");
      return;
    }

    const payload: ResourceDeclarationInput = {
      organizationName: orgName.trim(),
      organizationType: orgType,
      parishId,
      facilityCategory,
      location: location.trim(),
      resources: validResources,
    };

    mutate({ data: payload }, {
      onSuccess: () => {
        setSuccessMsg("Partner-reported declaration submitted for operational verification.");
        setOrgName("");
        setOrgType("");
        setParishId("");
        setFacilityCategory("");
        setLocation("");
        setResources([emptyRow()]);
        queryClient.invalidateQueries({ queryKey: getListResourceDeclarationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetResourceSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetParishInfrastructureQueryKey(payload.parishId) });
        setTimeout(() => setSuccessMsg(null), 6000);
      },
      onError: () => {
        setErrorMsg("Submission failed. Please try again.");
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-border bg-card/40 rounded-sm flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Resource Declaration
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* Success / Error banners */}
        {successMsg && (
          <div className="flex items-center gap-2 border border-green-500/40 bg-green-500/10 text-green-500 font-mono text-xs px-3 py-2 rounded-sm">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-wide">{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 border border-red-500/40 bg-red-500/10 text-red-500 font-mono text-xs px-3 py-2 rounded-sm">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-wide">{errorMsg}</span>
          </div>
        )}

        {/* Organization details */}
        <fieldset className="space-y-2">
          <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Organization Details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className={inputCls}
                placeholder="e.g. Grace Kennedy Logistics"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Organization Type
              </label>
              <select
                required
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className={selectCls}
              >
                <option value="" disabled>Select Type</option>
                {ORG_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Parish
              </label>
              <select
                required
                value={parishId}
                onChange={(e) => setParishId(e.target.value)}
                className={selectCls}
              >
                <option value="" disabled>Select Parish</option>
                {PARISHES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Facility Category
              </label>
              <select
                required
                value={facilityCategory}
                onChange={(e) => setFacilityCategory(e.target.value as InfrastructureCategory)}
                className={selectCls}
              >
                <option value="" disabled>Select Category</option>
                {FACILITY_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <label className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Facility Location / Address
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputCls}
                placeholder="Street, district, or facility address"
              />
            </div>
          </div>
        </fieldset>

        {/* Resource rows */}
        <fieldset className="space-y-2">
          <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          Partner-Reported Resource Capacity
          </legend>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_1fr_1fr_32px] gap-2 px-0 mb-1">
            {["Type", "Qty", "Unit", "Availability", ""].map((h) => (
              <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
                {h}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            {resources.map((row, idx) => (
              <ResourceRow
                key={idx}
                row={row}
                index={idx}
                canRemove={resources.length > 1}
                onChange={updateRow}
                onRemove={removeRow}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-primary/70 hover:text-primary transition-colors mt-2 px-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Resource Row
          </button>
        </fieldset>
      </div>

      {/* Footer / Submit */}
      <div className="px-4 py-3 border-t border-border bg-muted/10 shrink-0">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "w-full h-9 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-widest rounded-sm border transition-colors",
            isPending
              ? "bg-primary/20 border-primary/30 text-primary/50 cursor-not-allowed"
              : "bg-primary/10 border-primary/40 text-primary hover:bg-primary/20"
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Declaration"
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Live Feed ────────────────────────────────────────────────────────────────

function LiveFeed() {
  const { data: declarations, isLoading } = useListResourceDeclarations({
    query: { queryKey: getListResourceDeclarationsQueryKey(), refetchInterval: 30_000 },
  });

  const sorted = [...(declarations ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Group by facility category for a faster shared resource picture.
  const grouped = sorted.reduce<Record<string, typeof sorted>>((acc, decl) => {
    if (!acc[decl.facilityCategory]) acc[decl.facilityCategory] = [];
    acc[decl.facilityCategory].push(decl);
    return acc;
  }, {});

  return (
    <div className="border border-border bg-card/40 rounded-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 shrink-0 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Live Declarations Feed
        </span>
        <span className="font-mono text-[9px] text-muted-foreground/50 uppercase">
          Auto-refresh 30s
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {isLoading && (
          <div className="flex items-center justify-center h-32 text-muted-foreground font-mono text-xs uppercase tracking-widest animate-pulse">
            Loading…
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground/50 font-mono text-xs uppercase tracking-widest text-center">
            No declarations yet — be the first to declare.
          </div>
        )}

        {Object.entries(grouped).map(([facilityCategory, decls]) => (
          <div key={facilityCategory} className="space-y-2">
            {/* Category header */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-primary/70">
                {FACILITY_CATEGORY_MAP[facilityCategory as InfrastructureCategory] ?? facilityCategory}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground/40 bg-muted/20 px-1.5 py-0.5 rounded-[2px] border border-border/40">
                {decls.length} {decls.length === 1 ? "declaration" : "declarations"}
              </span>
              <div className="flex-1 h-px bg-border/30" />
            </div>

            {/* Declaration cards */}
            {decls.map((decl) => (
              <div
                key={decl.id}
                className="border border-border/60 bg-background/60 rounded-sm p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs text-foreground uppercase tracking-wide">
                      {decl.organizationName}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                      {ORG_TYPE_MAP[decl.organizationType] ?? decl.organizationType}
                    </div>
                     <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-primary/70">
                       {FACILITY_CATEGORY_MAP[decl.facilityCategory]} · {decl.location}
                     </div>
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground/50 uppercase shrink-0">
                    {relativeTime(decl.timestamp)}
                  </div>
                </div>

                {/* Resource tags */}
                <div className="flex flex-wrap gap-1.5">
                  {decl.resources.map((r, i) => (
                    <span
                      key={i}
                      className="font-mono text-[10px] uppercase tracking-wide bg-primary/10 border border-primary/20 text-primary/80 px-2 py-0.5 rounded-[2px]"
                    >
                      {r.quantity.toLocaleString()} {r.unit} {r.resourceType.replace(/_/g, " ")} — {AVAILABILITY_LABELS[r.availabilityWindow]}
                    </span>
                  ))}
                </div>
                 {decl.contactNotes && (
                   <p className="text-[10px] leading-relaxed text-muted-foreground">{decl.contactNotes}</p>
                 )}
                 <p className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground/50">
                   {decl.provenance === "demo_seed" ? "Synthetic demo seed" : "Unverified submission"} · demo store resets when the server restarts
                 </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivateSectorPartner() {
  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-4">
      {/* Banner */}
      <div className="shrink-0 border-b border-primary/30 bg-primary/10 px-4 py-1.5 flex items-center gap-3 -mx-4 -mt-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Unified Command — Private Sector Resources
        </span>
        <span className="font-mono text-[8px] uppercase tracking-wide text-muted-foreground">
          Declarations are partner reported and remain distinct from verified availability or deployment
        </span>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DeclarationForm />
        <LiveFeed />
      </div>
    </div>
  );
}
