import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Plus, UserPlus, Building2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ROLE_OPTIONS, type Role } from "@/contexts/RoleContext";
import { Badge } from "@/components/ui/badge";

export default function Organization() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("field_officer");
  const [inviteParish, setInviteParish] = useState("st-elizabeth");
  const [inviteCountry, setInviteCountry] = useState("JAM");

  const { data, isLoading, error } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const res = await fetch("/api/organization", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load organization data");
      return res.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: { email: string; role: Role; parishId: string; countryCode: string }) => {
      const res = await fetch("/api/organization/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setInviteEmail("");
      toast({ title: "Invitation sent", description: "Clerk will email the secure account activation link." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send invite", description: err.message, variant: "destructive" });
    }
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole, parishId: inviteParish, countryCode: inviteCountry });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-bold uppercase">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You do not have permission to view organization details.</p>
      </div>
    );
  }

  const members = data.members || [];
  const pending = data.pendingInvitations || [];
  const allowedInviteRoles: Role[] = data.allowedInviteRoles || [];
  const countries: Array<{ code: string; name: string }> = data.countries || [];

  return (
    <div className="flex-1 p-6 md:p-10 space-y-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 border-b border-border pb-6">
        <div className="p-3 bg-primary/10 rounded-md">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase">{data.name || "Organization"}</h1>
          <p className="text-muted-foreground text-sm">Manage members and invite new personnel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="font-semibold uppercase tracking-wide text-sm flex items-center gap-2">
                Active Members <Badge variant="secondary" className="font-mono">{members.length}</Badge>
              </h2>
            </div>
            <div className="divide-y divide-border">
              {members.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No active members found.</div>
              ) : (
                members.map((m: any, i: number) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{m.name || m.email}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-1">{m.email}</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono bg-primary/5 text-primary border-primary/20">
                        {ROLE_OPTIONS.find(r => r.value === m.role)?.label || m.role}
                      </Badge>
                      {m.parishId && (
                        <div className="text-[9px] text-muted-foreground uppercase font-mono mt-1">
                          Parish: {m.parishId}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden opacity-80">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <h2 className="font-semibold uppercase tracking-wide text-sm flex items-center gap-2">
                Pending Invitations <Badge variant="secondary" className="font-mono">{pending.length}</Badge>
              </h2>
            </div>
            <div className="divide-y divide-border">
              {pending.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No pending invitations.</div>
              ) : (
                pending.map((p: any, i: number) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{p.email}</div>
                        <div className="text-[10px] text-amber-500 uppercase font-mono mt-1">Awaiting Registration</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono text-muted-foreground">
                      {ROLE_OPTIONS.find(r => r.value === p.role)?.label || p.role}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {data.canInvite && <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden sticky top-6">
          <div className="p-4 border-b border-border bg-primary/10">
            <h2 className="font-semibold uppercase tracking-wide text-sm text-primary flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Issue Invitation
            </h2>
          </div>
          <form onSubmit={handleInvite} className="p-5 space-y-4">
            {countries.length > 0 && <div className="space-y-2">
              <label className="text-xs uppercase font-mono text-muted-foreground">Assign Country</label>
              <Select value={inviteCountry} onValueChange={setInviteCountry}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>}

            <div className="space-y-2">
              <label className="text-xs uppercase font-mono text-muted-foreground">Email Address</label>
              <Input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@agency.gov.jm" className="bg-background" />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs uppercase font-mono text-muted-foreground">Assign Role</label>
              <Select value={inviteRole} onValueChange={(val) => setInviteRole(val as Role)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.filter(r => allowedInviteRoles.includes(r.value)).map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inviteCountry === "JAM" && (inviteRole === 'parish_manager' || inviteRole === 'field_officer') && (
              <div className="space-y-2">
                <label className="text-xs uppercase font-mono text-muted-foreground">Assign Parish</label>
                <Select value={inviteParish} onValueChange={setInviteParish}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="st-elizabeth">St. Elizabeth</SelectItem>
                    <SelectItem value="kingston">Kingston</SelectItem>
                    <SelectItem value="st-andrew">St. Andrew</SelectItem>
                    <SelectItem value="manchester">Manchester</SelectItem>
                    <SelectItem value="clarendon">Clarendon</SelectItem>
                    <SelectItem value="hanover">Hanover</SelectItem>
                    <SelectItem value="portland">Portland</SelectItem>
                    <SelectItem value="st-ann">St. Ann</SelectItem>
                    <SelectItem value="st-catherine">St. Catherine</SelectItem>
                    <SelectItem value="st-james">St. James</SelectItem>
                    <SelectItem value="st-mary">St. Mary</SelectItem>
                    <SelectItem value="st-thomas">St. Thomas</SelectItem>
                    <SelectItem value="trelawny">Trelawny</SelectItem>
                    <SelectItem value="westmoreland">Westmoreland</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" disabled={inviteMutation.isPending} className="w-full mt-2">
              {inviteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Send Invite Link
            </Button>
          </form>
        </div>}
      </div>
    </div>
  );
}
