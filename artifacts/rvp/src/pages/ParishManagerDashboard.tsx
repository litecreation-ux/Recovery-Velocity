import { useListParishes } from "@workspace/api-client-react";
import JamaicaMap from "@/components/dashboard/JamaicaMap";
import ReadinessPanel from "@/components/dashboard/ReadinessPanel";
import ForecastPanel from "@/components/dashboard/ForecastPanel";
import ReportsPanel from "@/components/dashboard/ReportsPanel";
import ResourceExchangePanel from "@/components/dashboard/ResourceExchangePanel";
import ParishInfrastructurePanel from "@/components/dashboard/ParishInfrastructurePanel";
import { ShieldAlert, Target } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

export default function ParishManagerDashboard() {
  const { data: parishes } = useListParishes();
  const { parishId } = useRole();
  const parish = parishes?.find((item) => item.id === parishId);
  const parishName = parish?.name ?? parishId?.replaceAll("-", " ") ?? "Unassigned parish";

  if (!parishId) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-3">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-lg font-bold uppercase">Parish assignment required</h1>
          <p className="text-sm text-muted-foreground">
            Your account does not have a valid parish assignment. Contact an organization administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Banner */}
      <div className="shrink-0 border-b border-primary/30 bg-primary/10 px-4 py-1.5 flex items-center gap-3">
        <ShieldAlert className="w-3.5 h-3.5 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
          Ops Section Chief — {parishName}
        </span>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden p-4 gap-4">
        {/* Top Bar */}
        <header className="flex items-center shrink-0 h-10 border border-border bg-card/50 backdrop-blur rounded-sm px-4 gap-3">
          <Target className="w-4 h-4 text-primary" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Target Parish Sector
          </span>
          <span className="ml-auto font-mono text-xs text-primary uppercase tracking-wide">
            {parishName}
          </span>
        </header>

        {/* Grid Layout */}
        <div className="flex-1 min-h-0 grid grid-cols-12 gap-4">
          {/* Map - 7 Columns */}
          <div className="col-span-12 xl:col-span-7 flex flex-col border border-border bg-card/40 rounded-sm relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="px-4 py-2 border-b border-border/50 bg-muted/20 backdrop-blur shrink-0 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Tactical Overview</span>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-green-500" />
                  <span className="text-muted-foreground">Moderate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-amber-500" />
                  <span className="text-muted-foreground">At Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm bg-red-500" />
                  <span className="text-muted-foreground">Critical</span>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[400px]">
              <JamaicaMap
                selectedParishId={parishId}
                onSelectParish={() => {}}
                parishes={parishes || []}
              />
            </div>
          </div>

          {/* Panels - 5 Columns */}
          <div className="col-span-12 xl:col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
            <ReadinessPanel parishId={parishId} />
            <ForecastPanel parishId={parishId} stormScenario="category_3" />
            <ResourceExchangePanel />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
              <ReportsPanel parishId={parishId} />
            </div>
            <ParishInfrastructurePanel parishId={parishId} />
          </div>
        </div>
      </div>
    </div>
  );
}
