import { useEffect, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { AdministrativeFocusArea, RiskCountry } from "@workspace/api-client-react";
import "leaflet/dist/leaflet.css";

export type BoundarySelection = {
  id: string;
  name: string;
  level: string;
  scopeNote: string;
};

type BoundaryMeta = {
  canonical: string;
  sourceName: string;
  sourceUrl: string;
};

const GEOBOUNDARIES_REVISION = "9469f09592ced973a3448cf66b6100b741b64c0d";
const ADMINISTRATIVE_LEVELS: Record<string, string> = {
  BHS: "District",
  BRB: "Parish",
  BLZ: "District",
  DOM: "Province",
  HTI: "Department",
  ATG: "Parish and dependency",
  DMA: "Parish",
  GRD: "Parish",
  LCA: "District",
  VCT: "Parish",
  TTO: "Administrative region",
};

function boundaryId(feature: any) {
  const properties = feature?.properties ?? {};
  return `boundary:${properties.shapeID ?? properties.shapeISO ?? properties.shapeName ?? "unknown"}`;
}

function boundaryName(feature: any) {
  return feature?.properties?.shapeName ?? feature?.properties?.name ?? "Unnamed administrative area";
}

function MapFit({ country, areas }: { country: RiskCountry; areas: AdministrativeFocusArea[] }) {
  const map = useMap();

  useEffect(() => {
    if (areas.length > 1) {
      map.fitBounds(areas.map((area) => [area.latitude, area.longitude]), { padding: [40, 40], maxZoom: 9 });
    } else {
      const centers: Record<string, [number, number]> = {
        BHS: [24.3, -76], BRB: [13.2, -59.5], BLZ: [17.2, -88.5], DOM: [18.7, -70.2],
        HTI: [19, -72.3], ATG: [17.1, -61.8], DMA: [15.4, -61.4], GRD: [12.1, -61.7],
        LCA: [13.9, -60.98], VCT: [13.2, -61.2], TTO: [10.7, -61.2],
      };
      map.setView(centers[country.code] ?? [18.1, -77.3], 8);
    }
  }, [areas, country.code, map]);

  return null;
}

export function CountryFocusMap({
  country,
  areas,
  selectedId,
  onSelectArea,
  onSelectBoundary,
}: {
  country: RiskCountry;
  areas: AdministrativeFocusArea[];
  selectedId?: string;
  onSelectArea: (area: AdministrativeFocusArea) => void;
  onSelectBoundary: (boundary: BoundarySelection) => void;
}) {
  const [boundaries, setBoundaries] = useState<any>();
  const [boundaryMeta, setBoundaryMeta] = useState<BoundaryMeta>();
  const [boundaryError, setBoundaryError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setBoundaries(undefined);
    setBoundaryMeta(undefined);
    setBoundaryError(false);

    async function loadBoundaries() {
      try {
        const geometryUrl = `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${GEOBOUNDARIES_REVISION}/releaseData/gbOpen/${country.code}/ADM1/geoBoundaries-${country.code}-ADM1_simplified.geojson`;
        const geometryResponse = await fetch(geometryUrl, { signal: controller.signal });
        if (!geometryResponse.ok) throw new Error(`Boundary geometry returned ${geometryResponse.status}`);
        const geometry = await geometryResponse.json();
        if (!Array.isArray(geometry?.features)) throw new Error("Boundary source did not return GeoJSON features");

        setBoundaries(geometry);
        setBoundaryMeta({
          canonical: ADMINISTRATIVE_LEVELS[country.code] ?? "administrative area",
          sourceName: "geoBoundaries",
          sourceUrl: geometryUrl,
        });
      } catch (error) {
        if (!controller.signal.aborted) setBoundaryError(true);
      }
    }

    void loadBoundaries();
    return () => controller.abort();
  }, [country.code]);

  return (
    <div className="h-full min-h-[380px] w-full bg-[#0a0e17] relative">
      <MapContainer center={[country.code === "BHS" ? 24.3 : 18.1, country.code === "BHS" ? -76 : -77.3]} zoom={7} zoomControl={false} className="h-full w-full">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        />
        <MapFit country={country} areas={areas} />
        {boundaries && (
          <GeoJSON
            key={`${country.code}-${selectedId ?? "none"}`}
            data={boundaries}
            style={(feature) => {
              const selected = boundaryId(feature) === selectedId;
              return {
                fillColor: selected ? "#22d3ee" : "#f59e0b",
                color: selected ? "#22d3ee" : "#334155",
                fillOpacity: selected ? 0.7 : 0.3,
                opacity: 1,
                weight: selected ? 3 : 1,
              };
            }}
            onEachFeature={(feature, layer) => {
              const id = boundaryId(feature);
              const name = boundaryName(feature);
              layer.bindTooltip(`${name} · click for planning context`, { className: "rvp-tooltip" });
              layer.on({
                click: () => onSelectBoundary({
                  id,
                  name,
                  level: boundaryMeta?.canonical ?? "administrative area",
                  scopeNote: `Verified ${boundaryMeta?.canonical?.toLowerCase() ?? "administrative"} boundary from ${boundaryMeta?.sourceName ?? "geoBoundaries"}. Local readiness inputs have not been assessed.`,
                }),
                mouseover: (event) => event.target.setStyle({ fillOpacity: 0.7, weight: 2 }),
                mouseout: (event) => {
                  const selected = id === selectedId;
                  event.target.setStyle({ fillOpacity: selected ? 0.7 : 0.3, weight: selected ? 3 : 1 });
                },
              });
            }}
          />
        )}
        {areas.map((area) => {
          const selected = area.id === selectedId;
          return (
            <CircleMarker
              key={area.id}
              center={[area.latitude, area.longitude]}
              radius={selected ? 8 : 4}
              pathOptions={{
                color: selected ? "#22d3ee" : "#f59e0b",
                fillColor: selected ? "#22d3ee" : "#f59e0b",
                fillOpacity: selected ? 0.8 : 0.58,
                weight: selected ? 3 : 1,
              }}
              eventHandlers={{ click: () => onSelectArea(area) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <span className="font-mono text-xs">{area.name} · click for preparedness context</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="pointer-events-none absolute left-4 top-4 max-w-[260px] border border-primary/30 bg-background/85 px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {boundaryMeta ? `Verified ${boundaryMeta.canonical} boundaries` : boundaryError ? "Reference city map" : "Loading verified boundaries…"}
        <span className="mt-1 block normal-case tracking-normal">
          {boundaryMeta
            ? "Click an area to inspect its planning context. Scores remain national proxies until local inputs are verified."
            : "Markers are selectable planning locations, not live local incident reports."}
        </span>
      </div>
      {boundaryMeta && (
        <a
          href={boundaryMeta.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute right-4 top-4 border border-border/60 bg-background/85 px-2 py-1 font-mono text-[8px] uppercase text-muted-foreground hover:text-primary"
        >
          {boundaryMeta.sourceName} boundary source
        </a>
      )}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            onClick={() => onSelectArea(area)}
            className={`border px-2 py-1.5 font-mono text-[9px] uppercase transition-colors ${
              selectedId === area.id
                ? "border-primary bg-primary/20 text-primary"
                : "border-border bg-background/85 text-muted-foreground hover:border-primary/60"
            }`}
          >
            {area.name}
          </button>
        ))}
      </div>
    </div>
  );
}