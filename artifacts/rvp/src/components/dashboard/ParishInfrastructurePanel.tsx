import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Clock3,
  MapPinned,
} from "lucide-react";
import {
  getGetParishInfrastructurePlacesQueryKey,
  getGetParishInfrastructureQueryKey,
  useGetParishInfrastructure,
  useGetParishInfrastructurePlaces,
  type InfrastructureCategory,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const FACILITIES_PER_PAGE = 6;

type CategoryFilter = InfrastructureCategory | "all";

interface ParishInfrastructurePanelProps {
  parishId: string;
}

function relativeTime(timestamp: string) {
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return "Update time unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - parsed) / 60_000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}

export default function ParishInfrastructurePanel({ parishId }: ParishInfrastructurePanelProps) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [facilityPage, setFacilityPage] = useState(0);
  const selectedCategory = category === "all" ? "hotel" : category;
  const overviewQuery = useGetParishInfrastructure(parishId, {
    query: {
      queryKey: getGetParishInfrastructureQueryKey(parishId),
      enabled: category === "all",
      staleTime: 30_000,
      refetchInterval: 30_000,
    },
  });
  const placesQuery = useGetParishInfrastructurePlaces(parishId, selectedCategory, {
    query: {
      queryKey: getGetParishInfrastructurePlacesQueryKey(parishId, selectedCategory),
      enabled: category !== "all",
      staleTime: 30_000,
      refetchInterval: 30_000,
    },
  });
  const { data, isLoading, isError, refetch, isFetching } = category === "all" ? overviewQuery : placesQuery;

  const googlePlaces = useMemo(
    () => data?.googleDirectory.places.filter((place) => category === "all" || place.category === category) ?? [],
    [category, data],
  );

  const directoryStatus = data?.googleDirectory.status;
  const categoryLabel = category === "all"
    ? "All infrastructure"
    : data?.categories.find((item) => item.category === category)?.label ?? category.replace(/_/g, " ");
  const hoursReportedCount = googlePlaces.filter((place) => place.openNow != null).length;
  const openNowCount = googlePlaces.filter((place) => place.openNow === true).length;
  const facilityPageCount = Math.max(1, Math.ceil(googlePlaces.length / FACILITIES_PER_PAGE));
  const safeFacilityPage = Math.min(facilityPage, facilityPageCount - 1);
  const visibleGooglePlaces = googlePlaces.slice(
    safeFacilityPage * FACILITIES_PER_PAGE,
    (safeFacilityPage + 1) * FACILITIES_PER_PAGE,
  );

  useEffect(() => {
    setFacilityPage(0);
  }, [category, parishId]);

  useEffect(() => {
    if (facilityPage >= facilityPageCount) {
      setFacilityPage(Math.max(0, facilityPageCount - 1));
    }
  }, [facilityPage, facilityPageCount]);

  if (isError) {
    return (
      <section className="border border-destructive/40 bg-destructive/5 p-4">
        <p className="font-mono text-xs uppercase tracking-wider text-destructive">Infrastructure data unavailable</p>
        <p className="mt-2 text-xs text-muted-foreground">No availability has been inferred. Retry to reload the selected parish.</p>
        <button type="button" onClick={() => refetch()} className="mt-3 border border-destructive/40 px-3 py-1.5 font-mono text-[10px] uppercase text-destructive">
          Retry
        </button>
      </section>
    );
  }

  if (isLoading || !data) {
    return (
      <section className="min-h-48 border border-border bg-card/40 p-4" aria-busy="true">
        <div className="h-3 w-56 animate-pulse rounded bg-muted/60" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="h-28 animate-pulse rounded-sm bg-muted/30" />
          <div className="h-28 animate-pulse rounded-sm bg-muted/30" />
        </div>
      </section>
    );
  }

  return (
    <section className="border border-border bg-card/40 rounded-sm" aria-labelledby="parish-infrastructure-heading">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <h2 id="parish-infrastructure-heading" className="font-mono text-[11px] uppercase tracking-widest text-foreground">
              Infrastructure availability — {data.parishName}
            </h2>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Select a facility type to see how many were found and how many report open hours.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase text-muted-foreground">
          <Clock3 className={cn("h-3 w-3", isFetching && "animate-spin")} />
          {relativeTime(data.lastUpdated)}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-3 py-2" aria-label="Infrastructure category filters">
        <button
          type="button"
          onClick={() => setCategory("all")}
          aria-pressed={category === "all"}
          className={cn(
            "shrink-0 border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wide transition-colors",
            category === "all" ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {data.categories.map((item) => (
          <button
            key={item.category}
            type="button"
            onClick={() => setCategory(item.category)}
            aria-pressed={category === item.category}
            className={cn(
              "shrink-0 border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wide transition-colors",
              category === item.category ? "border-primary/50 bg-primary/15 text-primary" : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4">
        {category === "all" ? (
          <div className="border border-dashed border-border bg-background/30 p-5 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-foreground">Choose a facility type</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Select Banks, Hotels, Medical, or another category to load parish-specific totals and current status.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2" aria-label={`${categoryLabel} status summary`}>
              <div className="border border-border/70 bg-background/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Facilities found</p>
                <p className="mt-2 font-mono text-2xl text-foreground">{directoryStatus === "available" || directoryStatus === "stale" ? googlePlaces.length : "—"}</p>
                <p className="mt-1 text-[9px] text-muted-foreground">Public listings in {data.parishName}</p>
              </div>
              <div className="border border-border/70 bg-background/40 p-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Open now</p>
                <p className="mt-2 font-mono text-2xl text-emerald-400">{directoryStatus === "available" || directoryStatus === "stale" ? openNowCount : "—"}</p>
                <p className="mt-1 text-[9px] text-muted-foreground">Published hours available for {hoursReportedCount} of {googlePlaces.length}</p>
              </div>
            </div>

            {directoryStatus === "stale" && data.googleDirectory.fetchedAt && (
              <p className="font-mono text-[9px] uppercase tracking-wide text-amber-400/80">
                Counts use cached listing data · {relativeTime(data.googleDirectory.fetchedAt)}
              </p>
            )}
            {directoryStatus === "unavailable" && (
              <p className="border border-amber-500/30 bg-amber-500/5 p-3 text-[10px] text-amber-300/80">
                Facility and opening-hour counts are temporarily unavailable. Partner availability remains shown below.
              </p>
            )}

            {googlePlaces.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{categoryLabel} in {data.parishName}</span>
                  <span className="font-mono text-[9px] uppercase text-muted-foreground">{googlePlaces.length} found</span>
                </div>
                {visibleGooglePlaces.map((place) => (
                    <article key={place.placeId} className="flex items-center justify-between gap-3 border border-border/60 bg-card/50 px-3 py-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-mono text-[10px] uppercase tracking-wide text-foreground">{place.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-muted-foreground">
                          <MapPinned className="h-3 w-3 shrink-0" /> {place.address}
                        </p>
                      </div>
                      <span className={cn(
                        "shrink-0 border px-2 py-0.5 font-mono text-[8px] uppercase",
                        place.openNow === true && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                        place.openNow === false && "border-border bg-muted/20 text-muted-foreground",
                        place.openNow == null && "border-amber-500/30 bg-amber-500/10 text-amber-300",
                      )}>
                        {place.openNow === true ? "Open now" : place.openNow === false ? "Closed now" : "Hours unknown"}
                      </span>
                    </article>
                ))}
                {googlePlaces.length > FACILITIES_PER_PAGE && (
                  <div className="flex items-center justify-between gap-3 border border-border/60 bg-background/30 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setFacilityPage((page) => Math.max(0, page - 1))}
                      disabled={safeFacilityPage === 0}
                      className="border border-border px-2.5 py-1 font-mono text-[9px] uppercase text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                      Page {safeFacilityPage + 1} of {facilityPageCount} · {safeFacilityPage * FACILITIES_PER_PAGE + 1}–{Math.min((safeFacilityPage + 1) * FACILITIES_PER_PAGE, googlePlaces.length)} of {googlePlaces.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFacilityPage((page) => Math.min(facilityPageCount - 1, page + 1))}
                      disabled={safeFacilityPage === facilityPageCount - 1}
                      className="border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[9px] uppercase text-primary transition-colors hover:border-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
            {(directoryStatus === "available" || directoryStatus === "stale") && googlePlaces.length === 0 && (
              <p className="border border-border/60 bg-card/30 p-3 text-[10px] leading-relaxed text-muted-foreground">
                No matching facilities were found. This is not an official registry count.
              </p>
            )}
          </>
        )}

      </div>

      <div className="border-t border-border/50 bg-muted/10 px-4 py-2 text-[9px] leading-relaxed text-muted-foreground">
        “Open now” uses published business hours and does not confirm safety, staffing, stock, access, or emergency operations. Facility totals are search coverage, not an official registry.
      </div>
    </section>
  );
}