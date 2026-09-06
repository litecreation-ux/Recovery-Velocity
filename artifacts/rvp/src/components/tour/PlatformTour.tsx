import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@clerk/react';
import { Map, X, Compass, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRole } from '@/contexts/RoleContext';
import type { Role } from '@/contexts/RoleContext';

type TourStep = {
  path: string;
  title: string;
  description: string;
};

const TOUR_STEPS: Record<Role, TourStep[]> = {
  national_coordinator: [
    { path: '/', title: 'Command Overview', description: 'Monitor aggregate system status and global node health. Use this overview to maintain situational awareness of all operational regions.' },
    { path: '/ops/scores', title: 'Preparedness Planning', description: 'Review resilience scores and operational readiness across all commands prior to incident escalation.' },
    { path: '/ops/recommendations', title: 'Incident Action Plan', description: 'Review and approve strategic recommendations to formulate immediate action plans.' },
    { path: '/ops/tasks', title: 'Logistics Section', description: 'Allocate resources, track supply chains, and issue logistics tasks to fulfill operational requirements.' },
    { path: '/review', title: 'Incident Command', description: 'Review and clear pending incidents. Maintain oversight of critical thresholds and command gates.' },
    { path: '/task-manager', title: 'Task Manager', description: 'Track field accountability. Oversee the status of assigned objectives across all units.' },
    { path: '/unified-command', title: 'Unified Command', description: 'Coordinate shared command responsibilities. Align with external partners and mutual aid networks.' },
    { path: '/field-officer', title: 'Field Workspace', description: 'View localized field reports and direct unit assignments as observed by ground personnel.' },
    { path: '/agents', title: 'Agent Monitor', description: 'Supervise automated monitoring systems and automated telemetry agents for continuous network observation.' },
    { path: '/communications', title: 'Communications', description: 'Issue operational updates, manage public-alert approvals, and record communications received through external channels.' },
    { path: '/organization', title: 'Organization', description: 'Administer active personnel clearances and organization structure.' },
    { path: '/onboarding?edit=1', title: 'Profile Configuration', description: 'Update your operational clearance details and personal configuration.' }
  ],
  parish_manager: [
    { path: '/', title: 'Parish Dashboard', description: 'Monitor local conditions and incident status within your designated command sector.' },
    { path: '/ops/scores', title: 'Preparedness Planning', description: 'Evaluate parish-specific resilience indicators to identify logistical vulnerabilities.' },
    { path: '/ops/recommendations', title: 'Action Recommendations', description: 'Review intelligence-driven recommendations localized to your operational area.' },
    { path: '/ops/tasks', title: 'Logistics Workflow', description: 'Manage distribution of supplies and oversee direct logistics tasks in your sector.' },
    { path: '/review', title: 'Parish Incident Command', description: 'Review ground reports and manage incident escalation protocols for the parish.' },
    { path: '/task-manager', title: 'Task Manager', description: 'Assign and review tactical objectives for local field units.' },
    { path: '/unified-command', title: 'Unified Command', description: 'Synchronize efforts with mutual aid partners and adjacent parish command units.' },
    { path: '/communications', title: 'Communications', description: 'Coordinate operational messaging and review external communications.' },
    { path: '/organization', title: 'Organization', description: 'Review organizational rosters and invite local personnel.' },
    { path: '/onboarding?edit=1', title: 'Profile Configuration', description: 'Maintain your current operator credentials and contact parameters.' }
  ],
  field_officer: [
    { path: '/field-officer', title: 'Field Workspace', description: 'Review active field assignments, file ground intelligence, and submit evidence.' },
    { path: '/unified-command', title: 'Unified Command', description: 'View shared operational directives and acknowledge multi-agency objectives.' },
    { path: '/communications', title: 'Communications', description: 'Review operational updates and manually record communications received through external channels.' },
    { path: '/onboarding?edit=1', title: 'Profile Configuration', description: 'Ensure your contact information and clearance details are up to date.' }
  ],
  system_admin: [
    { path: '/agents', title: 'Agent Monitor', description: 'Oversee platform automation agents and verify telemetry infrastructure health.' },
    { path: '/communications', title: 'Communications', description: 'Monitor the integrity of all communication channels and alert broadcasts.' },
    { path: '/organization', title: 'Organization', description: 'Administer access controls, verify invitations, and maintain directory integrity.' },
    { path: '/onboarding?edit=1', title: 'Profile Configuration', description: 'Update your system administrator profile.' }
  ],
  private_sector_partner: [
    { path: '/', title: 'Infrastructure View', description: 'Report resource availability, declare business continuity status, and view collaborative impact zones.' },
    { path: '/communications', title: 'Communications', description: 'Acknowledge urgent updates and coordinate multi-party communications.' },
    { path: '/organization', title: 'Organization', description: 'Review partnered operational contacts and roster availability.' },
    { path: '/onboarding?edit=1', title: 'Profile Configuration', description: 'Maintain accurate partner contact and capabilities records.' }
  ]
};

export function PlatformTour({
  requested,
  onStart
}: {
  requested: boolean;
  onStart: () => void;
}) {
  const { role, isAuthorityLoading } = useRole();
  const { userId } = useAuth();
  const [, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!role || !userId || isAuthorityLoading) return;
    const storageKey = `rvp_tour_completed_${userId}_${role}`;
    const hasCompleted = localStorage.getItem(storageKey) === 'true';

    if (requested) {
      setIsActive(true);
      setStepIndex(0);
      onStart();
    } else if (!hasCompleted && !isActive && !isCompleted) {
      setIsActive(true);
      setStepIndex(0);
    }
  }, [requested, role, userId, isAuthorityLoading, isActive, isCompleted, onStart]);

  const steps = role ? TOUR_STEPS[role] : [];
  
  useEffect(() => {
    if (isActive && steps && steps[stepIndex]) {
      setLocation(steps[stepIndex].path);
    }
  }, [stepIndex, isActive, setLocation, steps]);

  if (!isActive || !steps || steps.length === 0) return null;

  const step = steps[stepIndex];
  const total = steps.length;

  const handleNext = () => {
    if (stepIndex < total - 1) {
      setStepIndex(i => i + 1);
    } else {
      finishTour();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
    }
  };

  const finishTour = () => {
    if (role && userId) {
      localStorage.setItem(`rvp_tour_completed_${userId}_${role}`, 'true');
    }
    setIsActive(false);
    setIsCompleted(true);
  };

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="platform-tour-title" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[100] sm:w-[400px] shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-primary/30 bg-background rounded-md overflow-hidden flex flex-col pointer-events-auto animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:4px_4px]" />
        <div className="flex items-center gap-2 relative z-10">
          <Compass className="w-4 h-4" />
          <span className="font-mono text-[10px] tracking-widest uppercase font-bold">Mission Briefing</span>
        </div>
        <button
          onClick={finishTour}
          className="relative z-10 text-primary-foreground/70 hover:text-primary-foreground transition-colors p-1"
          title="Dismiss Guide"
          data-testid="tour-button-close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-0.5 w-full bg-primary/10">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
        />
      </div>

      <div className="p-5 flex flex-col gap-3 relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Map className="w-32 h-32" />
        </div>

        <div className="relative z-10" aria-live="polite" aria-atomic="true">
          <h3 id="platform-tour-title" className="font-semibold text-base text-foreground mb-1 tracking-tight" data-testid="tour-text-title">
            {step.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed min-h-[4rem]" data-testid="tour-text-description">
            {step.description}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-border/40 mt-auto bg-muted/10">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider" data-testid="tour-text-progress">
          {stepIndex + 1} // {total}
        </span>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="h-8 text-xs font-mono uppercase tracking-wide border-primary/20 hover:bg-primary/5"
              data-testid="tour-button-back"
            >
              Back
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleNext}
            className="h-8 text-xs font-mono uppercase tracking-wide bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="tour-button-next"
          >
            {stepIndex === total - 1 ? (
              <span className="flex items-center gap-1.5">
                Finish <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}