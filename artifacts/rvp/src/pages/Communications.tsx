import { useEffect, useState } from "react";
import { Radio, Send, CheckCircle2, WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import { useCountry } from "@/contexts/CountryContext";
import { enqueueOperation, flushQueuedOperations, queuedOperations } from "@/lib/communications-queue";

type Priority = "emergency" | "urgent" | "operational" | "information";
type Audience = "authorized_scope" | "incident_commanders" | "command_team" | "field_teams" | "unified_command_partners" | "public";
type Message = { id: string; body: string; priority: Priority; channel: string; deliveryState: string; audience: Audience; senderName: string; createdAt: string; expiresAt: string | null; publicStatus: string | null; acknowledgementCount: number; acknowledgedByCurrentUser: boolean };
type RadioLog = { id: string; station: string; direction: string; body: string; priority: Priority; occurredAt: string; recorderName: string };
const priorities: Priority[] = ["emergency", "urgent", "operational", "information"];

const clientId = () => crypto.randomUUID();

export default function Communications() {
  const { parishId, role, onboardingData } = useRole();
  const { selectedCountryCode } = useCountry();
  const authorizedCountryCode = role === "system_admin"
    ? selectedCountryCode
    : onboardingData?.authority?.countryCode;
  const [messages, setMessages] = useState<Message[]>([]);
  const [radio, setRadio] = useState<RadioLog[]>([]);
  const [priority, setPriority] = useState<Priority>("operational");
  const [channel, setChannel] = useState("app");
  const [audience, setAudience] = useState<Audience>("authorized_scope");
  const [expiresAt, setExpiresAt] = useState("");
  const [body, setBody] = useState("");
  const [station, setStation] = useState("");
  const [direction, setDirection] = useState("outgoing");
  const [radioBody, setRadioBody] = useState("");
  const [filter, setFilter] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [pending, setPending] = useState(0);
  const [pendingAlerts, setPendingAlerts] = useState<Message[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [live, setLive] = useState(false);

  const refresh = async () => {
    const approver = role === "system_admin" || role === "national_coordinator";
    const [messageResponse, radioResponse, outbox, pendingResponse] = await Promise.all([
      fetch(`/api/communications?${new URLSearchParams({ ...(filter ? { priority: filter } : {}), ...(audienceFilter ? { audience: audienceFilter } : {}) })}`, { credentials: "include" }),
      fetch("/api/radio-traffic", { credentials: "include" }),
      queuedOperations(),
      approver ? fetch("/api/communications/public-alerts/pending", { credentials: "include" }) : Promise.resolve(undefined),
    ]);
    if (messageResponse.ok) setMessages(await messageResponse.json());
    if (radioResponse.ok) setRadio(await radioResponse.json());
    if (pendingResponse?.ok) setPendingAlerts(await pendingResponse.json());
    setPending(outbox.length);
  };
  const flush = async () => {
    if (!navigator.onLine) return;
    await flushQueuedOperations();
    await refresh();
  };
  useEffect(() => {
    void flush();
    const onOnline = () => { setOnline(true); void flush(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  // The queue must flush on startup and the browser online event.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const stream = new EventSource("/api/communications/events");
    stream.addEventListener("ready", () => setLive(true));
    stream.addEventListener("refresh", () => { setLive(true); void refresh(); });
    stream.onerror = () => setLive(false);
    return () => stream.close();
  // A single stream reconnects itself; events only invalidate canonical GET data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { void refresh(); }, [filter, audienceFilter]);

  const submit = async (url: string, payload?: Record<string, unknown>) => {
    const operation = { id: clientId(), method: "POST" as const, url, body: payload, queuedAt: new Date().toISOString() };
    if (!navigator.onLine) { await enqueueOperation(operation); await refresh(); return; }
    try {
      const response = await fetch(url, { method: "POST", credentials: "include", headers: payload ? { "Content-Type": "application/json" } : undefined, body: payload ? JSON.stringify(payload) : undefined });
      if (!response.ok) throw new Error("Request was not accepted");
      await refresh();
    } catch {
      await enqueueOperation(operation);
      await refresh();
    }
  };
  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    if (!authorizedCountryCode) return;
    if (audience === "public" && !expiresAt) return;
    await submit("/api/communications", { clientId: clientId(), body: body.trim(), priority, channel, audience, countryCode: authorizedCountryCode, ...(parishId ? { parishId } : {}), ...(audience === "public" ? { expiresAt: new Date(expiresAt).toISOString() } : {}) });
    setBody("");
    setExpiresAt("");
  };
  const sendRadio = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!station.trim() || !radioBody.trim()) return;
    if (!authorizedCountryCode) return;
    await submit("/api/radio-traffic", { clientId: clientId(), station: station.trim(), direction, body: radioBody.trim(), occurredAt: new Date().toISOString(), priority, countryCode: authorizedCountryCode, ...(parishId ? { parishId } : {}) });
    setRadioBody("");
  };

  return <div className="p-5 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
    <header className="flex flex-wrap gap-4 items-end justify-between border-b border-border pb-5">
      <div><p className="font-mono text-[10px] tracking-[.2em] text-primary uppercase">Resilient communications</p><h1 className="text-2xl font-bold uppercase tracking-tight">Operational traffic</h1><p className="text-muted-foreground mt-1">Authenticated records, acknowledgement tracking, and offline outbox.</p></div>
      <div className="flex items-center gap-2"><Badge variant={online ? "secondary" : "destructive"}>{online ? "Network available" : "Offline"}</Badge><Badge variant={live ? "secondary" : "outline"}>{live ? "Live" : "Disconnected"}</Badge><Badge variant="outline">{pending} queued / not delivered</Badge><Button variant="outline" size="sm" onClick={() => void flush()}><RefreshCw className="w-4 h-4 mr-2" />Flush outbox</Button></div>
    </header>
    {!online && <div className="border border-amber-500/40 bg-amber-500/10 p-3 text-sm flex gap-2"><WifiOff className="w-4 h-4 shrink-0" />New operations are retained locally and will send when the browser reconnects.</div>}
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={sendMessage} className="border border-border bg-card p-5 space-y-4"><h2 className="font-semibold uppercase text-sm flex gap-2 items-center"><Send className="w-4 h-4 text-primary" />Compose communication</h2><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Operational message" required /><div className="grid grid-cols-2 gap-3"><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="h-10 bg-background border border-input px-3 text-sm">{priorities.map((item) => <option key={item}>{item}</option>)}</select><select value={channel} onChange={(e) => setChannel(e.target.value)} className="h-10 bg-background border border-input px-3 text-sm"><option value="app">App</option><option value="radio">Radio</option><option value="sms">SMS request only</option></select><select value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className="h-10 col-span-2 bg-background border border-input px-3 text-sm"><option value="authorized_scope">Authorized scope</option><option value="incident_commanders">Incident commanders</option><option value="command_team">Command team</option><option value="field_teams">Field teams</option><option value="unified_command_partners">Unified command partners</option><option value="public">Public alert (approval required)</option></select></div>{audience === "public" && <><Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required /><p className="text-xs text-amber-600">Public alerts remain pending approval and are not published until an authorized reviewer approves them.</p></>}{channel === "sms" && <p className="text-xs text-amber-600">SMS is recorded as a requested fallback only. No external SMS delivery provider is connected.</p>}<Button type="submit" className="w-full">Record communication</Button></form>
      <form onSubmit={sendRadio} className="border border-border bg-card p-5 space-y-4"><h2 className="font-semibold uppercase text-sm flex gap-2 items-center"><Radio className="w-4 h-4 text-primary" />External communications log</h2><p className="text-xs text-muted-foreground">Manually record updates received or sent through radio, phone, satellite, or in-person channels.</p><div className="grid grid-cols-2 gap-3"><Input value={station} onChange={(e) => setStation(e.target.value)} placeholder="Source / contact" required /><select value={direction} onChange={(e) => setDirection(e.target.value)} className="h-10 bg-background border border-input px-3 text-sm"><option value="outgoing">Outgoing</option><option value="incoming">Incoming</option></select></div><Textarea value={radioBody} onChange={(e) => setRadioBody(e.target.value)} placeholder="Communication details" required /><Button type="submit" variant="outline" className="w-full">Record external communication</Button></form>
    </div>
    <section className="border border-border bg-card"><div className="p-4 border-b border-border flex flex-wrap gap-3 justify-between items-center"><h2 className="font-semibold uppercase text-sm">Message board</h2><div className="flex gap-2"><select aria-label="Filter priority" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 bg-background border border-input px-2 text-xs"><option value="">All priorities</option>{priorities.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Filter audience" value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value)} className="h-8 bg-background border border-input px-2 text-xs"><option value="">All audiences</option><option value="authorized_scope">Authorized scope</option><option value="incident_commanders">Incident commanders</option><option value="command_team">Command team</option><option value="field_teams">Field teams</option><option value="unified_command_partners">Partners</option><option value="public">Public</option></select></div></div><div className="divide-y divide-border">{messages.length ? messages.map((message) => <div key={message.id} className="p-4 flex flex-wrap gap-3 justify-between"><div className="max-w-3xl"><div className="flex gap-2 mb-2"><Badge>{message.priority}</Badge><Badge variant="outline">{message.audience}</Badge><Badge variant="outline">{message.channel} · {message.deliveryState}</Badge>{message.publicStatus && <Badge variant="outline">{message.publicStatus}</Badge>}</div><p>{message.body}</p><p className="mt-2 text-xs text-muted-foreground">{message.senderName} · {new Date(message.createdAt).toLocaleString()} · {message.acknowledgementCount} acknowledgements{message.expiresAt ? ` · expires ${new Date(message.expiresAt).toLocaleString()}` : ""}</p></div>{message.acknowledgedByCurrentUser ? <span className="text-xs text-emerald-600 flex gap-1 items-center"><CheckCircle2 className="w-4 h-4" />Acknowledged</span> : <Button size="sm" variant="outline" onClick={() => void submit(`/api/communications/${message.id}/acknowledgements`)}>Acknowledge</Button>}</div>) : <p className="p-6 text-muted-foreground">No communications in this authorized scope.</p>}</div></section>
    {pendingAlerts.length > 0 && <section className="border border-amber-500/40 bg-card"><div className="p-4 border-b border-border"><h2 className="font-semibold uppercase text-sm">Public alert approval queue</h2></div>{pendingAlerts.map((alert) => <div key={alert.id} className="p-4 border-b border-border last:border-0 flex flex-wrap gap-3 justify-between"><div><Badge>{alert.priority}</Badge><p className="mt-2">{alert.body}</p><p className="text-xs text-muted-foreground mt-1">Expires {alert.expiresAt && new Date(alert.expiresAt).toLocaleString()}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => void submit(`/api/communications/${alert.id}/public-alert-review`, { action: "approve" })}>Approve & publish</Button><Button size="sm" variant="outline" onClick={() => { const reason = window.prompt("Rejection reason"); if (reason) void submit(`/api/communications/${alert.id}/public-alert-review`, { action: "reject", rejectionReason: reason }); }}>Reject</Button></div></div>)}</section>}
    <section className="border border-border bg-card"><div className="p-4 border-b border-border"><h2 className="font-semibold uppercase text-sm">Recent external communications</h2></div><div className="divide-y divide-border">{radio.slice(0, 10).map((log) => <div key={log.id} className="p-4"><Badge variant="outline">{log.priority}</Badge><p className="mt-2 font-mono text-xs text-muted-foreground">{log.station} · {log.direction} · {new Date(log.occurredAt).toLocaleString()} · {log.recorderName}</p><p className="mt-1">{log.body}</p></div>)}{!radio.length && <p className="p-6 text-muted-foreground">No external communications in this authorized scope.</p>}</div></section>
  </div>;
}