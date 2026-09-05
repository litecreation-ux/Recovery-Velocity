import { Building2, Landmark, RadioTower, ShieldCheck, Stethoscope } from "lucide-react";
import type { ResilienceScore, RiskCountry, WorldBankIndicator } from "@workspace/api-client-react";

type FocusArea = {
  name: string;
  level: string;
  scopeNote: string;
};

function indicator(indicators: WorldBankIndicator[], code: string) {
  return indicators.find((item) => item.code === code);
}

export function FocusAreaDetails({
  country,
  area,
  indicators,
  resilience,
}: {
  country: RiskCountry;
  area?: FocusArea;
  indicators: WorldBankIndicator[];
  resilience: ResilienceScore;
}) {
  const gdp = indicator(indicators, "NY.GDP.PCAP.CD");
  const internet = indicator(indicators, "IT.NET.USER.ZS");
  const life = indicator(indicators, "SP.DYN.LE00.IN");
  const title = area ? `${area.name} focus` : "Select a mapped location";

  return (
    <section className="border border-border bg-card/40 rounded-sm p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{title}</div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {area?.scopeNote ?? "Choose a city marker to inspect the local data boundary and the country-level preparedness context."}
      </p>
      <div className="relative mt-4 overflow-hidden border border-border bg-background/40 p-3">
        <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
        <div className="flex items-start justify-between gap-3 pl-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Focus Area Readiness</span>
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase text-amber-500">
              {area ? "National planning proxy" : "Select a focus area"}
            </div>
          </div>
          <div className="font-mono text-3xl font-bold tracking-tighter text-amber-500">
            {area ? resilience.score ?? "—" : "—"}<span className="ml-1 text-sm text-muted-foreground">/100</span>
          </div>
        </div>
        <p className="mt-2 pl-2 text-[9px] leading-relaxed text-muted-foreground">
          {area
            ? `No verified ${area.level}-level readiness score is available for ${area.name}. The national score is shown as planning context only; it is not a local measurement.`
            : "Click a mapped reference location to see its readiness boundary and national planning context."}
        </p>
      </div>
      <div className="mt-4 grid gap-2">
        <Category title="Infrastructure" icon={Building2} value={area ? "Not assessed locally" : "Choose a location"} detail="No local infrastructure feed has been onboarded." />
        <Category
          title="Finance"
          icon={Landmark}
          value={gdp?.value == null ? "National source unavailable" : `$${gdp.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} national GDP / capita`}
          detail={gdp?.date ? `World Bank national indicator (${gdp.date}); not a local measure.` : "No current national indicator available."}
        />
        <Category
          title="Health"
          icon={Stethoscope}
          value={life?.value == null ? "National source unavailable" : `${life.value.toFixed(1)} years life expectancy`}
          detail={life?.date ? `World Bank national indicator (${life.date}); not a local measure.` : "No current national indicator available."}
        />
        <Category
          title="Communications"
          icon={RadioTower}
          value={internet?.value == null ? "National source unavailable" : `${internet.value.toFixed(1)}% internet use`}
          detail={internet?.date ? `World Bank national indicator (${internet.date}); not a local measure.` : "No current national indicator available."}
        />
      </div>
      <p className="mt-3 font-mono text-[8px] uppercase text-muted-foreground">{country.name} · country-level planning context only</p>
    </section>
  );
}

function Category({
  title,
  icon: Icon,
  value,
  detail,
}: {
  title: string;
  icon: typeof Building2;
  value: string;
  detail: string;
}) {
  return (
    <div className="border border-border/50 bg-background/30 p-2.5">
      <div className="flex items-center gap-2 font-mono text-[9px] uppercase text-muted-foreground"><Icon className="h-3 w-3 text-primary" /> {title}</div>
      <div className="mt-1 font-mono text-[11px] text-foreground">{value}</div>
      <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}