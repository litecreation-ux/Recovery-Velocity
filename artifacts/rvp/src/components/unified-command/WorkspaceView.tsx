import { UnifiedCommandWorkspace } from "@workspace/api-client-react";
import { ObjectivesSection } from "./sections/ObjectivesSection";
import { CommunicationsSection } from "./sections/CommunicationsSection";
import { BoundariesSection } from "./sections/BoundariesSection";
import { LogisticsSection } from "./sections/LogisticsSection";
import { RegionalAidSection } from "./sections/RegionalAidSection";
import { PersonnelSection } from "./sections/PersonnelSection";
import CommanderAccessPanel from "@/components/dashboard/CommanderAccessPanel";
import { Shield, Activity, Map as MapIcon, Package, Users, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

export function WorkspaceView({ workspace }: { workspace: UnifiedCommandWorkspace }) {
  const { role } = useRole();
  const isActive = workspace.status === 'active';
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'logistics', label: 'Logistics', icon: Package },
    { id: 'regional-aid', label: 'Regional Aid', icon: Globe2 },
    { id: 'boundaries', label: 'Boundaries', icon: MapIcon },
    { id: 'personnel', label: 'Personnel', icon: Users },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex-none border-b border-border bg-card/50 p-4 lg:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-mono text-lg sm:text-xl uppercase font-bold tracking-tight text-foreground">
              {workspace.name}
            </h1>
            <Badge variant={isActive ? "default" : "secondary"} className="font-mono uppercase text-[10px]">
              {workspace.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="font-mono text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <span>INCIDENT: {workspace.incidentName}</span>
            <span className="opacity-50">|</span>
            <span>OP: {workspace.currentActor.name} ({workspace.currentActor.role})</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 sm:text-right">
           <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Capabilities</div>
           <div className="flex gap-1 flex-wrap sm:justify-end">
             {workspace.capabilities.map(cap => (
               <Badge key={cap} variant="outline" className="font-mono text-[9px] uppercase bg-background border-border text-muted-foreground">
                 {cap.replace(/_/g, ' ')}
               </Badge>
             ))}
           </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 lg:p-6 pb-0">
        <div className="flex overflow-x-auto border-b border-border gap-4 shrink-0 no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-2 py-3 border-b-2 font-mono text-xs uppercase transition-colors whitespace-nowrap",
                activeTab === tab.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden mt-4 pb-4">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
              <ObjectivesSection workspace={workspace} />
              <CommunicationsSection workspace={workspace} />
            </div>
          )}
          {activeTab === 'logistics' && <LogisticsSection workspace={workspace} />}
          {activeTab === 'regional-aid' && <RegionalAidSection workspace={workspace} />}
          {activeTab === 'boundaries' && <BoundariesSection workspace={workspace} />}
          {activeTab === 'personnel' && (
            <div className="h-full overflow-y-auto space-y-6">
              {role && <CommanderAccessPanel role={role} workspaceId={workspace.id} />}
              <PersonnelSection workspace={workspace} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}