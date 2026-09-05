import { useEffect, useState } from "react";
import { AlertTriangle, Radio } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

type Alert = { id: string; body: string; priority: string; channel: string; countryCode: string; parishId: string | null; issuedAt: string; expiresAt: string };
const parishes = ["kingston", "st-andrew", "st-thomas", "portland", "st-mary", "st-ann", "trelawny", "st-james", "hanover", "westmoreland", "st-elizabeth", "manchester", "clarendon", "st-catherine"];

export default function PublicAlerts() {
  const [countryCode, setCountryCode] = useState("JAM");
  const [parishId, setParishId] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams({ countryCode });
    if (countryCode === "JAM" && parishId) params.set("parishId", parishId);
    fetch(`/api/communications/public-alerts?${params}`, { credentials: "omit" })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("Public alerts are temporarily unavailable.")))
      .then(setAlerts).catch((reason: Error) => setError(reason.message));
  }, [countryCode, parishId]);
  useEffect(() => {
    const params = new URLSearchParams({ countryCode });
    if (countryCode === "JAM" && parishId) params.set("parishId", parishId);
    const stream = new EventSource(`/api/communications/public-alerts/events?${params}`);
    const reload = () => {
      setLive(true);
      fetch(`/api/communications/public-alerts?${params}`, { credentials: "omit" }).then((response) => response.ok ? response.json() : Promise.reject()).then(setAlerts).catch(() => setLive(false));
    };
    stream.addEventListener("ready", () => setLive(true));
    stream.addEventListener("refresh", reload);
    stream.onerror = () => setLive(false);
    return () => stream.close();
  }, [countryCode, parishId]);
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card px-6 py-8"><div className="max-w-5xl mx-auto"><div className="flex gap-2 items-center font-mono text-xs uppercase tracking-widest text-primary"><Radio className="w-4 h-4" />RVP public alerts</div><h1 className="mt-3 text-3xl font-bold tracking-tight">Official public alerts</h1><p className="mt-2 text-muted-foreground max-w-2xl">Only approved, current alerts appear here. Follow directions from emergency authorities and use local emergency services for immediate danger.</p><Link href="/public/parishes" className="inline-block mt-4 text-sm text-primary hover:underline">Parish resilience information</Link></div></header>
    <div className="max-w-5xl mx-auto p-6 md:p-8"><div className="flex flex-wrap items-end gap-3 mb-6"><label className="text-sm">Country<select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="block mt-1 h-10 border border-input bg-card px-3"><option value="JAM">Jamaica</option><option value="BHS">Bahamas</option><option value="BRB">Barbados</option></select></label>{countryCode === "JAM" && <label className="text-sm">Parish (optional)<select value={parishId} onChange={(e) => setParishId(e.target.value)} className="block mt-1 h-10 border border-input bg-card px-3"><option value="">All Jamaica</option>{parishes.map((parish) => <option key={parish} value={parish}>{parish.replace("-", " ")}</option>)}</select></label>}<Badge variant={live ? "secondary" : "outline"}>{live ? "Live" : "Disconnected"}</Badge></div>
      {error && <p className="border border-destructive/40 p-4 text-destructive">{error}</p>}
      <p className="mb-5 border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">You may install this public app from your browser. Notification permissions are not requested automatically; alerts can be delivered through browser notifications after a push delivery provider is enabled.</p><div className="space-y-4">{alerts.length ? alerts.map((alert) => <article key={alert.id} className="border border-border bg-card p-5"><div className="flex flex-wrap gap-2"><Badge>{alert.priority}</Badge><Badge variant="outline">{alert.parishId ?? alert.countryCode}</Badge></div><p className="mt-3 text-base leading-relaxed">{alert.body}</p><p className="mt-4 text-xs font-mono text-muted-foreground uppercase">Issued {new Date(alert.issuedAt).toLocaleString()} · Expires {new Date(alert.expiresAt).toLocaleString()}</p></article>) : <div className="border border-border p-8 text-center text-muted-foreground"><AlertTriangle className="mx-auto mb-3 w-7 h-7" />No current approved public alerts match this area.</div>}</div>
    </div>
  </main>;
}