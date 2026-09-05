import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ShieldAlert, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLE_OPTIONS } from "@/contexts/RoleContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/react";
import { workspaceRouteForAuthority } from "@/lib/authority-routing";
import {
  onboardingQueryKey,
  onboardingQueryOptions,
  parseOnboardingResponse,
  type OnboardingProfile,
  type OnboardingResponse,
} from "@/lib/onboarding-contract";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  
  const [formData, setFormData] = useState<Partial<OnboardingProfile>>({});

  const { data, isLoading, error } = useQuery<OnboardingResponse>({
    ...onboardingQueryOptions(),
    enabled: isLoaded && isSignedIn,
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to submit onboarding");
      }
      return parseOnboardingResponse(await res.json());
    },
    onSuccess: (data: OnboardingResponse) => {
      queryClient.setQueryData(onboardingQueryKey, data);
      toast({ title: "Profile saved", description: "Your onboarding information has been updated." });
      const workspaceRoute = workspaceRouteForAuthority(data.authority);
      if (workspaceRoute) {
        setLocation(workspaceRoute);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    const workspaceRoute = workspaceRouteForAuthority(data?.authority ?? null);
    if (workspaceRoute) {
      setLocation(workspaceRoute);
    }
  }, [data?.authority, setLocation]);

  useEffect(() => {
    if (data?.profile) {
      setFormData((prev) => ({
        ...prev,
        fullName: data.profile!.fullName || "",
        jobTitle: data.profile!.jobTitle || "",
        phone: data.profile!.phone || "",
        organization: data.profile!.organization || "",
        agency: data.profile!.agency || "",
        jurisdiction: data.profile!.jurisdiction || "",
        station: data.profile!.station || "",
        responsibilities: data.profile!.responsibilities || "",
        sector: data.profile!.sector || "",
        capabilities: data.profile!.capabilities || "",
      }));
    }
  }, [data?.profile]);

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-background text-center p-6 space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold">Failed to load status</h2>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!data.emailVerified) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-background text-center p-6 space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-500" />
        <h2 className="text-xl font-bold uppercase tracking-tight">Email Verification Required</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Please check your email and follow the link to verify your address before continuing.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>I have verified my email</Button>
      </div>
    );
  }

  const profile = data.profile;
  const assignedRole = profile?.requestedRole;
  const roleLabel = ROLE_OPTIONS.find((r) => r.value === assignedRole)?.label || assignedRole;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullName: formData.fullName,
      jobTitle: formData.jobTitle,
      phone: formData.phone,
      // Only include role-specific fields
      ...(assignedRole === 'national_coordinator' && { agency: formData.agency, jurisdiction: formData.jurisdiction }),
      ...(assignedRole === 'field_officer' && { station: formData.station }),
      ...(assignedRole === 'system_admin' && { responsibilities: formData.responsibilities }),
      ...(assignedRole === 'private_sector_partner' && { sector: formData.sector, capabilities: formData.capabilities }),
    };
    mutation.mutate(payload);
  };

  return (
    <div className="relative flex min-h-full flex-col items-center justify-start bg-background p-4 py-8">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background opacity-50 z-0" />
      
      <div className="relative z-10 w-full max-w-2xl bg-card border border-border shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 md:p-8 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold uppercase tracking-tight">Onboarding</h1>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-xs uppercase tracking-widest font-mono">
              Sign Out
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Complete your operational profile to access the RVP system.</p>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          {(
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="bg-primary/5 border border-primary/20 rounded-md p-4 space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-2">Server-Assigned Authorization</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {profile?.organization && (
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Organization</div>
                      <div className="font-medium">{profile.organization}</div>
                    </div>
                  )}
                  {assignedRole && (
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Role</div>
                      <div className="font-medium">{roleLabel}</div>
                    </div>
                  )}
                  {profile?.parishId && (
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">Assigned Parish</div>
                      <div className="font-medium uppercase">{profile.parishId.replace("-", " ")}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide border-b border-border pb-2">Common Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-mono text-muted-foreground">Full Name</label>
                    <Input required value={formData.fullName || ""} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-mono text-muted-foreground">Job Title</label>
                    <Input required value={formData.jobTitle || ""} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} className="bg-background" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-mono text-muted-foreground">Phone Number</label>
                    <Input required type="tel" value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-background" />
                  </div>
                </div>
              </div>

              {assignedRole && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide border-b border-border pb-2">Role-Specific Details</h3>
                  <div className="grid grid-cols-1 gap-4">
                    
                    {assignedRole === 'national_coordinator' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs uppercase font-mono text-muted-foreground">Agency</label>
                          <Input required value={formData.agency || ""} onChange={(e) => setFormData({ ...formData, agency: e.target.value })} className="bg-background" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase font-mono text-muted-foreground">Jurisdiction</label>
                          <Input required value={formData.jurisdiction || ""} onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })} className="bg-background" />
                        </div>
                      </>
                    )}
                    
                    {assignedRole === 'field_officer' && (
                      <div className="space-y-2">
                        <label className="text-xs uppercase font-mono text-muted-foreground">Station / Base</label>
                        <Input required value={formData.station || ""} onChange={(e) => setFormData({ ...formData, station: e.target.value })} className="bg-background" />
                      </div>
                    )}
                    
                    {assignedRole === 'system_admin' && (
                      <div className="space-y-2">
                        <label className="text-xs uppercase font-mono text-muted-foreground">Responsibilities</label>
                        <Input required value={formData.responsibilities || ""} onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })} className="bg-background" />
                      </div>
                    )}

                    {assignedRole === 'private_sector_partner' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs uppercase font-mono text-muted-foreground">Sector</label>
                          <Input required value={formData.sector || ""} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} className="bg-background" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs uppercase font-mono text-muted-foreground">Resources & Capabilities</label>
                          <Input required value={formData.capabilities || ""} onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })} className="bg-background" />
                        </div>
                      </>
                    )}

                  </div>
                </div>
              )}

              <Button type="submit" disabled={mutation.isPending} className="w-full">
                {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Submit Profile
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
