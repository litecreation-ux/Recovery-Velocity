import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Parish } from '@workspace/api-client-react';
import { jamaicaGeoJson } from '@/lib/jamaica-geojson';

interface JamaicaMapProps {
  selectedParishId: string;
  onSelectParish: (id: string) => void;
  parishes: Parish[];
}

function getColor(score: number, readinessLevel?: Parish['readinessLevel']) {
  if (readinessLevel === 'Moderate') return '#22c55e';
  if (readinessLevel === 'At risk') return '#f59e0b';
  if (readinessLevel === 'Critical') return '#ef4444';
  if (score >= 65) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function MapFit() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[17.65, -78.4], [18.55, -76.1]]);
  }, [map]);
  return null;
}

export default function JamaicaMap({ selectedParishId, onSelectParish, parishes }: JamaicaMapProps) {
  const parishMap = useMemo(() => {
    const m = new Map<string, Parish>();
    parishes.forEach(p => m.set(p.id, p));
    return m;
  }, [parishes]);

  // Use a key to re-render GeoJSON layer when selection changes so styles update
  const geoKey = selectedParishId;

  return (
    <div className="w-full h-full bg-[#0a0e17] relative">
      <MapContainer
        center={[18.1, -77.3]}
        zoom={9}
        zoomControl={false}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <GeoJSON
          key={geoKey}
          data={jamaicaGeoJson as any}
          style={(feature) => {
            const id = feature?.properties?.parishId ?? '';
            const parish = parishMap.get(id);
            const score = parish?.readinessScore ?? 60;
            const isSelected = selectedParishId === id;
            return {
               fillColor: getColor(score, parish?.readinessLevel),
              weight: isSelected ? 3 : 1,
              opacity: 1,
              color: isSelected ? '#00bfff' : '#1e293b',
              fillOpacity: isSelected ? 0.75 : 0.45,
            };
          }}
          onEachFeature={(feature, layer) => {
            const id = feature?.properties?.parishId ?? '';
            const name = feature?.properties?.name ?? '';
            layer.bindTooltip(name, { permanent: false, className: 'rvp-tooltip' });
            layer.on({
              click: () => onSelectParish(id),
              mouseover: (e) => {
                e.target.setStyle({ fillOpacity: 0.9, weight: 2 });
              },
              mouseout: (e) => {
                const isSelected = selectedParishId === id;
                e.target.setStyle({
                  fillOpacity: isSelected ? 0.75 : 0.45,
                  weight: isSelected ? 3 : 1,
                  color: isSelected ? '#00bfff' : '#1e293b',
                });
              },
            });
          }}
        />
        <MapFit />
      </MapContainer>

      {/* Corner reticles */}
      <div className="absolute inset-0 pointer-events-none border border-primary/20 m-4 rounded-sm" />
      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-primary pointer-events-none" />
      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-primary pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-primary pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-primary pointer-events-none" />
    </div>
  );
}
