import { Link, useLocation } from "wouter";
import {
  Activity,
  Map as MapIcon,
  ShieldAlert,
  Terminal,
  Clock,
  Satellite,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  Gauge,
  UsersRound,
  UserRound,
  Network,
  Globe,
  LogOut,
  UserCircle,
  Building,
  Radio,
  Compass
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { PlatformTour } from "@/components/tour/PlatformTour";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/react";
import {
  getGetDashboardSummaryQueryKey,
  getGetCountryRiskOverviewQueryKey,
  getListRiskCountriesQueryKey,
  useGetCountryRiskOverview,
  useGetDashboardSummary,
  useListRiskCountries,
} from "@workspace/api-client-react";
import { ROLE_OPTIONS, useRole } from "@/contexts/RoleContext";
import { useCountry } from "@/contexts/CountryContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThreatAdvisoryStrip } from "@/components/layout/ThreatAdvisoryStrip";

export default function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const [time, setTime] = useState(new Date());
  const [tourRequested, setTourRequested] = useState(false);
  const { role, isAuthorityLoading } = useRole();
  // These might fail if no role, but we can safely call them
  const { data: summary } = useGetDashboardSummary({
    query: { enabled: role === 'system_admin', queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { selectedCountryCode, setSelectedCountryCode } = useCountry();
  const { data: countries, isLoading: countriesLoading } = useListRiskCountries({
    query: { queryKey: getListRiskCountriesQueryKey(), staleTime: 60 * 60 * 1000 },
  });
  const { data: countryRisk, isLoading: phaseLoading, isError: phaseError } = useGetCountryRiskOverview(selectedCountryCode, {
    query: { queryKey: getGetCountryRiskOverviewQueryKey(selectedCountryCode), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000 },
  });
  const [opsOpen, setOpsOpen] = useState(location === '/' || (location.startsWith('/ops/') && !location.startsWith('/ops/incidents')));
  const [staffOpen, setStaffOpen] = useState(location === '/field-officer' || location.startsWith('/ops/incidents') || location === '/unified-command');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = (() => {
    switch (role) {
      case 'national_coordinator':
        return [
          { href: '/review', label: 'Incident Command', icon: ShieldAlert, badge: summary?.pendingReviewCount },
          { href: '/task-manager', label: 'Task Manager', icon: ClipboardList },
          { href: '/communications', label: 'Communications', icon: Radio },
        ];
      case 'parish_manager':
        return [
          { href: '/review', label: 'Incident Command', icon: ShieldAlert, badge: summary?.pendingReviewCount },
          { href: '/task-manager', label: 'Task Manager', icon: ClipboardList },
          { href: '/communications', label: 'Communications', icon: Radio },
        ];
      case 'field_officer':
        return [{ href: '/communications', label: 'Communications', icon: Radio }];
      case 'system_admin':
        return [
          { href: '/agents', label: 'Agent Monitor', icon: Terminal, badge: summary?.activeAgents },
          { href: '/communications', label: 'Communications', icon: Radio },
        ];
      case 'private_sector_partner':
        return [
          { href: '/', label: 'Infrastructure and Resources', icon: Building2 },
          { href: '/communications', label: 'Communications', icon: Radio },
        ];
      default:
        return [];
    }
  })();

  const showNetworkStatus = role === 'system_admin';
  const roleLabel = ROLE_OPTIONS.find(o => o.value === role)?.label;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-border bg-card flex flex-col z-20 shadow-xl">
        <div className="h-16 flex items-center px-4 border-b border-border">
          <Satellite className="w-6 h-6 text-primary md:mr-3 mx-auto md:mx-0" />
          <div className="hidden md:block">
            <h1 className="font-bold tracking-tight text-foreground uppercase">RVP SYSTEM</h1>
            <div className="text-[10px] text-primary/80 font-mono tracking-widest uppercase">
              Mission Control
            </div>
          </div>
        </div>
        {/* User context */}
        <div className="hidden md:block px-3 py-3 border-b border-border bg-muted/10">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
            Operator
          </div>
          <div className="flex flex-col gap-1 px-1">
            <div className="text-xs font-medium text-foreground truncate">
              {isAuthorityLoading ? 'Verifying access...' : (roleLabel || 'Pending Clearance')}
            </div>
            {role && (
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide truncate">
                {role.replace('_', ' ')}
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-1">
            <Link href="/onboarding?edit=1" className="flex-1 flex items-center justify-center gap-1.5 h-7 bg-background border border-border hover:bg-muted text-[9px] uppercase font-mono tracking-wider transition-colors rounded-sm text-foreground">
              <UserCircle className="w-3 h-3" />
              Profile
            </Link>
            <Link href="/organization" className="flex-1 flex items-center justify-center gap-1.5 h-7 bg-background border border-border hover:bg-muted text-[9px] uppercase font-mono tracking-wider transition-colors rounded-sm text-foreground">
              <Building className="w-3 h-3" />
              Org
            </Link>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
          {(role === 'national_coordinator' || role === 'parish_manager') && (
            <div>
              <button
                type="button"
                aria-expanded={opsOpen}
                onClick={() => setOpsOpen((value) => !value)}
                className={cn(
                  "flex w-full items-center px-3 py-2.5 rounded-sm transition-colors",
                  (location === '/' || (location.startsWith('/ops/') && !location.startsWith('/ops/incidents'))) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <MapIcon className="w-4 h-4 md:mr-3 mx-auto md:mx-0" />
                <span className="hidden md:block font-medium tracking-wide text-xs uppercase flex-1 text-left">ICS Workflow</span>
                {opsOpen ? <ChevronDown className="hidden h-3.5 w-3.5 md:block" /> : <ChevronRight className="hidden h-3.5 w-3.5 md:block" />}
              </button>
              {opsOpen && (
                <div className="hidden border-l border-border/60 pl-3 ml-5 md:block">
                  {[
                    { href: '/', label: 'Command Overview', icon: MapIcon },
                    { href: '/ops/scores', label: 'Preparedness Planning', icon: Gauge },
                    { href: '/ops/recommendations', label: 'Incident Action Plan', icon: Lightbulb },
                    { href: '/ops/tasks', label: 'Logistics Section', icon: ClipboardList },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} className={cn(
                      "flex items-center gap-2 px-2 py-2 font-mono text-[9px] uppercase text-muted-foreground hover:text-primary",
                      location === item.href && "text-primary",
                    )}>
                      <item.icon className="h-3 w-3" />{item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          {(role === 'national_coordinator' || role === 'parish_manager' || role === 'field_officer') && (
            <div>
              <button
                type="button"
                aria-expanded={staffOpen}
                onClick={() => setStaffOpen((value) => !value)}
                className={cn(
                  "flex w-full items-center px-3 py-2.5 rounded-sm transition-colors",
                  (location === '/field-officer' || location.startsWith('/ops/incidents') || location === '/unified-command') ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <UsersRound className="w-4 h-4 md:mr-3 mx-auto md:mx-0" />
                <span className="hidden md:block font-medium tracking-wide text-xs uppercase flex-1 text-left">Unified Command</span>
                {staffOpen ? <ChevronDown className="hidden h-3.5 w-3.5 md:block" /> : <ChevronRight className="hidden h-3.5 w-3.5 md:block" />}
              </button>
              {staffOpen && (
                <div className="hidden border-l border-border/60 pl-3 ml-5 md:block">
                  <Link href="/unified-command" className={cn(
                    "flex items-center gap-2 px-2 py-2 font-mono text-[9px] uppercase text-muted-foreground hover:text-primary",
                    location === '/unified-command' && "text-primary",
                  )}>
                    <Network className="h-3 w-3" />Unified Command
                  </Link>
                  {(role !== 'field_officer') && (
                    <Link href="/ops/incidents" className={cn(
                      "flex items-center gap-2 px-2 py-2 font-mono text-[9px] uppercase text-muted-foreground hover:text-primary",
                      location.startsWith('/ops/incidents') && "text-primary",
                    )}>
                      <ShieldAlert className="h-3 w-3" />Ops Section
                    </Link>
                  )}
                  <Link href="/field-officer" className={cn(
                    "flex items-center gap-2 px-2 py-2 font-mono text-[9px] uppercase text-muted-foreground hover:text-primary",
                    location === '/field-officer' && "text-primary",
                  )}>
                    <UserRound className="h-3 w-3" />Field Officer
                  </Link>
                </div>
              )}
            </div>
          )}
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-sm transition-colors cursor-pointer group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                    "w-4 h-4 md:mr-3 mx-auto md:mx-0",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="hidden md:block font-medium tracking-wide text-xs uppercase flex-1">{item.label}</span>
                  {'badge' in item && item.badge ? (
                    <span className="font-mono text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-[2px]">
                      {item.badge}
                    </span>
                  ) : isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                  )}
                </div>
              </Link>
            );
          })}

          <div className="mt-4 pt-4 border-t border-border/40">
            <button
              onClick={() => setTourRequested(true)}
              className="flex w-full items-center px-3 py-2.5 rounded-sm transition-colors cursor-pointer group text-muted-foreground hover:bg-muted hover:text-foreground"
              data-testid="nav-button-tour"
              title="Platform Guide"
            >
              <Compass className="w-4 h-4 md:mr-3 mx-auto md:mx-0 text-muted-foreground group-hover:text-foreground" />
              <span className="hidden md:block font-medium tracking-wide text-xs uppercase flex-1 text-left">Guide</span>
            </button>
          </div>
        </nav>

        <div className="hidden md:block border-t border-border bg-muted/10 px-3 py-3">
          <div className="mb-1.5 px-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Global focus
          </div>
          <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
            <SelectTrigger className="h-8 border-primary/30 bg-background text-[10px] font-mono uppercase">
              <SelectValue placeholder={countriesLoading ? "Loading countries…" : "Select country"} />
            </SelectTrigger>
            <SelectContent>
              {countries?.map((country) => (
                <SelectItem key={country.code} value={country.code} className="text-[10px] font-mono uppercase">
                  <div className="flex items-center gap-2">
                    <span>{country.name}</span>
                    <span className="text-[9px] text-muted-foreground">{country.region}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showNetworkStatus && summary && (
          <div className="hidden md:block px-4 py-3 border-t border-border bg-muted/10 space-y-2">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Network Status</div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground">Critical Nodes</span>
              <span className="text-red-500">{summary.criticalCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground">At Risk Nodes</span>
              <span className="text-amber-500">{summary.atRiskCount}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground">Nominal Nodes</span>
              <span className="text-green-500">{summary.moderateCount}</span>
            </div>
          </div>
        )}

        <div className="hidden md:block p-4 border-t border-border mt-auto bg-muted/30 shrink-0">
          <Link href="/public/parishes" className="flex items-center gap-2 mb-4 text-[10px] font-mono font-medium text-primary hover:text-primary/80 transition-colors uppercase tracking-widest cursor-pointer">
            <Globe className="w-3.5 h-3.5" />
            Public Portal
          </Link>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="font-mono text-xs text-green-500 uppercase">System Nominal</span>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground font-mono text-[10px] uppercase">
            <Clock className="w-3.5 h-3.5" />
            {time.toISOString().replace('T', ' ').substring(0, 19)} UTC
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0 flex-col min-w-0 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background opacity-50 z-0" />
        <div className="relative z-20 shrink-0">
          <ThreatAdvisoryStrip overview={countryRisk} isLoading={phaseLoading} isError={phaseError} />
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col min-w-0 overflow-y-auto overscroll-contain touch-pan-y">
          {children}
        </div>
        <PlatformTour requested={tourRequested} onStart={() => setTourRequested(false)} />
      </main>
    </div>
  );
}