import { useEffect, useState, useRef } from "react";
import { MapPin, AlertTriangle, Droplets, HeartPulse, Fuel, Building2, UploadCloud, Camera, CheckCircle2, ChevronRight, FileWarning, Search, XCircle, Info, Image as ImageIcon } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListParishes,
  useGetParishResources,
  useGetParishInfrastructure,
  useGetParishInfrastructurePlaces,
  useGetCountryRiskOverview,
  useGetParishCitizenReports,
  useSubmitCitizenReport,
  getGetParishCitizenReportsQueryKey,
  type InfrastructureCategory,
} from "@workspace/api-client-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const reportSchema = z.object({
  reporterName: z.string().min(2, "Name is required").max(50),
  content: z.string().min(10, "Please provide more details").max(1000),
  category: z.enum(["infrastructure", "medical", "supplies", "flooding", "shelter", "other"], {
    required_error: "Please select a category",
  }),
  location: z.string().max(160, "Location must be 160 characters or fewer").optional(),
});

// Adjacency follows the Jamaica parish boundary context used by the project map.
const PARISH_NEIGHBORS: Record<string, string[]> = {
  kingston: ["st-andrew", "st-thomas"],
  "st-andrew": ["kingston", "st-thomas", "portland", "st-mary", "st-catherine"],
  "st-thomas": ["kingston", "st-andrew", "portland"],
  portland: ["st-thomas", "st-andrew", "st-mary"],
  "st-mary": ["portland", "st-andrew", "st-ann"],
  "st-ann": ["st-mary", "st-catherine", "clarendon", "trelawny"],
  trelawny: ["st-ann", "clarendon", "st-james", "manchester"],
  "st-james": ["trelawny", "hanover", "westmoreland", "st-elizabeth"],
  hanover: ["st-james", "westmoreland"],
  westmoreland: ["hanover", "st-james", "st-elizabeth"],
  "st-elizabeth": ["westmoreland", "st-james", "trelawny", "manchester"],
  manchester: ["st-elizabeth", "trelawny", "clarendon"],
  clarendon: ["manchester", "trelawny", "st-ann", "st-catherine"],
  "st-catherine": ["clarendon", "st-ann", "st-mary", "st-andrew"],
};

type ReportFormValues = z.infer<typeof reportSchema>;

export default function PublicParishResilience() {
  const [selectedParishId, setSelectedParishId] = useState<string | null>(
    () => window.localStorage.getItem("rvp-public-parish"),
  );
  
  const { data: parishes, isLoading: loadingParishes } = useListParishes();
  
  useEffect(() => {
    if (parishes && (!selectedParishId || !parishes.some((parish) => parish.id === selectedParishId)) && parishes.length > 0) {
      setSelectedParishId(parishes[0].id);
    }
  }, [parishes, selectedParishId]);

  useEffect(() => {
    if (selectedParishId) window.localStorage.setItem("rvp-public-parish", selectedParishId);
  }, [selectedParishId]);

  const selectedParish = parishes?.find(p => p.id === selectedParishId);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-8 md:py-12 shrink-0 relative z-20">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono uppercase tracking-widest mb-2">
            <GlobeIcon className="w-3.5 h-3.5" />
            Public Resilience Portal
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Parish Status & Reports
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Current source-labelled infrastructure references, preparedness indicators, and citizen reporting for Jamaica's parishes.
          </p>
           <a href="/public/alerts" className="inline-block text-sm font-medium text-primary hover:underline">View official public alerts</a>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Sidebar / Selector */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm font-mono uppercase text-muted-foreground">Select Parish</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingParishes ? (
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar">
                      {parishes?.map((parish) => (
                        <button
                          key={parish.id}
                          onClick={() => setSelectedParishId(parish.id)}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors text-left border-b border-border last:border-0",
                            selectedParishId === parish.id
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {parish.name}
                          {selectedParishId === parish.id && <ChevronRight className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* National Advisories */}
              <NationalAdvisories />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {selectedParishId ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">{selectedParish?.name || "Parish"} Overview</h2>
                    {selectedParish?.readinessLevel && (
                      <Badge variant="outline" className={cn(
                        "ml-auto text-xs uppercase font-mono px-2 py-1",
                        selectedParish.readinessLevel === 'Critical' ? "text-red-500 border-red-500/50" :
                        selectedParish.readinessLevel === 'At risk' ? "text-amber-500 border-amber-500/50" :
                        "text-green-500 border-green-500/50"
                      )}>
                        {selectedParish.readinessLevel}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ResourceIndicators parishId={selectedParishId} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-8 sticky top-0">
                      <InfrastructureList parishId={selectedParishId} />
                      <NearbyParishes parishes={parishes || []} currentId={selectedParishId} onSelect={setSelectedParishId} />
                    </div>
                    <div className="space-y-8">
                      <ReportForm parishId={selectedParishId} />
                      <CitizenReports parishId={selectedParishId} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground">
                  <MapPin className="w-12 h-12 mb-4 opacity-50" />
                  <p>Select a parish to view details</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  )
}

function NationalAdvisories() {
  const { data, isLoading, isError } = useGetCountryRiskOverview("JAM");

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (isError || !data) {
    return (
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <AlertTitle>Warning source unavailable</AlertTitle>
        <AlertDescription>No threat has been inferred. Use official emergency channels for current guidance.</AlertDescription>
      </Alert>
    );
  }

  const advisories = data.currentThreatAdvisories;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Active Advisories
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {advisories.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No live threat signal reported. This does not guarantee that conditions are safe.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {advisories.map((adv) => (
              <div key={adv.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm leading-tight">{adv.title}</span>
                  <Badge variant="outline" className={cn(
                    "text-[10px] px-1.5 py-0 uppercase font-mono shrink-0",
                    adv.severity === 'high' || adv.severity === 'critical' ? "text-red-500 border-red-500/30" : "text-amber-500 border-amber-500/30"
                  )}>
                    {adv.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{adv.summary}</p>
                <div className="flex flex-wrap gap-2 font-mono text-[9px] uppercase text-muted-foreground">
                  <span>{adv.status}</span>
                  <span>{adv.sourceStatus}</span>
                  <span>{adv.sourceName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResourceIndicators({ parishId }: { parishId: string }) {
  const { data, isLoading } = useGetParishResources(parishId);

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </>
    );
  }

  const indicators = [
    { label: "Fuel Capacity", value: data?.fuelPercent, icon: Fuel, color: "text-amber-500" },
    { label: "Water Reserves", value: data?.waterPercent, icon: Droplets, color: "text-blue-500" },
    { label: "Medical Supply", value: data?.medicalPercent, icon: HeartPulse, color: "text-red-500" },
  ];

  return (
    <>
      {indicators.map((ind, i) => (
        <Card key={i} className="bg-card border-border overflow-hidden">
          <div className="p-5 flex items-start gap-4">
            <div className={cn("p-3 rounded-md bg-muted/50", ind.color)}>
              <ind.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">{ind.label}</div>
              <div className="text-3xl font-bold tracking-tight">
                {ind.value !== undefined && ind.value !== null ? `${ind.value}%` : '--'}
              </div>
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted">
            <div 
              className={cn("h-full transition-all duration-1000", ind.value && ind.value < 30 ? "bg-red-500" : "bg-primary")} 
              style={{ width: `${ind.value || 0}%` }} 
            />
          </div>
          <div className="border-t border-border/60 px-5 py-2 text-[9px] text-muted-foreground">
            RVP parish preparedness indicator · updated {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "time unavailable"} · not live stock
          </div>
        </Card>
      ))}
    </>
  );
}

function InfrastructureList({ parishId }: { parishId: string }) {
  const { data, isLoading } = useGetParishInfrastructure(parishId);
  const [category, setCategory] = useState<InfrastructureCategory>("medical");
  const places = useGetParishInfrastructurePlaces(parishId, category);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Public Infrastructure
        </CardTitle>
        <CardDescription>Partner-reported availability and references</CardDescription>
      </CardHeader>
      
      <div className="px-6 pb-2">
        <Alert className="bg-muted/50 border-primary/20 text-foreground py-3">
          <Info className="w-4 h-4 text-primary" />
          <AlertTitle className="text-xs font-mono uppercase text-primary tracking-widest mb-1">Disclaimer</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            This information is gathered from public sources and partner reports. Always verify directly before traveling during emergencies.
          </AlertDescription>
        </Alert>
      </div>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {data?.categories?.length ? (
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Directory References</h4>
                <div className="grid gap-2">
                  {data.categories.map((cat, i) => (
                    <a
                      key={i}
                      href={cat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded border border-border bg-muted/20 hover:bg-muted/50 transition-colors group"
                    >
                      <span className="text-sm font-medium">{cat.label}</span>
                      <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {data?.partnerOffers?.length ? (
              <div className="space-y-3 mt-6">
                <h4 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Partner Reports</h4>
                <div className="space-y-3">
                  {data.partnerOffers.map((offer) => (
                    <div key={offer.id} className="p-3 border border-border rounded-md bg-background space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm">{offer.organizationName}</div>
                          <div className="text-xs text-muted-foreground capitalize">{offer.facilityCategory.replace('_', ' ')}</div>
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[10px] uppercase font-mono",
                          offer.verificationStatus === 'verified' ? "text-green-500 border-green-500/30" : "text-muted-foreground"
                        )}>
                          {offer.verificationStatus}
                        </Badge>
                      </div>
                      {offer.contactNotes && (
                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">{offer.contactNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-md">
                No active partner reports at this time.
              </div>
            )}

            <div className="space-y-3 border-t border-border pt-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">Public directory listings</h4>
                <Select value={category} onValueChange={(value) => setCategory(value as InfrastructureCategory)}>
                  <SelectTrigger className="h-8 w-40 bg-background text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data?.categories.map((item) => <SelectItem key={item.category} value={item.category}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {places.isLoading ? <Skeleton className="h-24 w-full" /> : places.isError || places.data?.googleDirectory.status === "unavailable" ? (
                <p className="text-xs text-amber-300">Directory data is unavailable. No facility availability has been inferred.</p>
              ) : places.data?.googleDirectory.places.length ? (
                places.data.googleDirectory.places.slice(0, 6).map((place) => (
                  <div key={place.placeId} className="border border-border bg-background p-3">
                    <div className="text-sm font-medium">{place.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{place.address}</div>
                    <Badge variant="outline" className="mt-2 text-[9px] uppercase">
                      {place.openNow === true ? "Published as open now" : place.openNow === false ? "Published as closed" : "Hours unknown"}
                    </Badge>
                  </div>
                ))
              ) : <p className="text-xs text-muted-foreground">No matching public listings were found. This is not an official registry count.</p>}
              <p className="text-[10px] text-muted-foreground">Published hours do not confirm safety, staffing, stock, access, or emergency operations.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CitizenReports({ parishId }: { parishId: string }) {
  const { data, isLoading } = useGetParishCitizenReports(parishId);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-primary" />
          Recent Citizen Reports
        </CardTitle>
        <CardDescription>Community-submitted field observations</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : data?.length ? (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {data.slice().reverse().map((report) => (
              <div key={report.id} className="relative pl-4 border-l-2 border-primary/30 py-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-foreground">{report.reporterName}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {new Date(report.timestamp).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                {report.category && (
                  <Badge variant="secondary" className="text-[9px] uppercase font-mono px-1.5 py-0 mb-1">
                    {report.category}
                  </Badge>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.content}</p>
                 {report.location && <div className="text-[10px] text-muted-foreground">Location: {report.location}</div>}
                 {report.photoObjectPath && (
                    <a href={`/api${report.photoObjectPath}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline mt-1">
                     <ImageIcon className="w-3 h-3" /> View Evidence
                   </a>
                )}
                 {report.hasPhoto && !report.photoObjectPath && (
                   <div className="text-[10px] text-amber-400">Photo held for moderation</div>
                 )}
                <div className="flex items-center gap-1.5 mt-2">
                  {report.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-500 uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending Verification
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-green-500 uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" />
                      Reviewed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-md">
            No recent reports for this area.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportForm({ parishId }: { parishId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const submitReport = useSubmitCitizenReport();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reporterName: "",
      content: "",
      category: "other",
      location: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
        toast({
          title: "Photo not accepted",
          description: "Choose a JPEG, PNG, or WebP image no larger than 5 MB.",
          variant: "destructive",
        });
        e.target.value = "";
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const onSubmit = async (values: ReportFormValues) => {
    try {
      setIsUploading(true);
      let photoObjectPath = undefined;

      // 1. Upload file if present
      if (selectedFile) {
        const reqRes = await fetch('/api/storage/uploads/request-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedFile.name,
            size: selectedFile.size,
            contentType: selectedFile.type,
          }),
        });

        if (!reqRes.ok) {
          throw new Error("Failed to request upload URL");
        }

        const { uploadURL, objectPath } = await reqRes.json();

        const uploadRes = await fetch(uploadURL, {
          method: 'PUT',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file to storage");
        }

        photoObjectPath = objectPath;
      }

      // 2. Submit report
      await submitReport.mutateAsync({
        parishId,
        data: {
          reporterName: values.reporterName,
          content: values.content,
          category: values.category,
          location: values.location?.trim() || undefined,
          photoObjectPath,
        },
      });

      // 3. Reset and invalidate
      form.reset();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      toast({
        title: "Report Submitted",
        description: "Your report has been logged and is pending review.",
      });

      queryClient.invalidateQueries({
        queryKey: getGetParishCitizenReportsQueryKey(parishId),
      });

    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-md relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
      <CardHeader>
        <CardTitle className="text-lg">Submit Observation</CardTitle>
        <CardDescription>
          Reports and photos are untrusted public submissions held for review. They do not change readiness, resource availability, dispatch, or command decisions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reporterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Your Name / Alias</FormLabel>
                    <FormControl>
                      <Input placeholder="John D." {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="infrastructure">Infrastructure Damage</SelectItem>
                        <SelectItem value="flooding">Flooding</SelectItem>
                        <SelectItem value="medical">Medical Need</SelectItem>
                        <SelectItem value="supplies">Supply Shortage</SelectItem>
                        <SelectItem value="shelter">Shelter Status</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Details</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the current situation..." 
                      className="min-h-[100px] resize-y bg-background" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase font-mono text-muted-foreground">Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Road, district, or landmark" {...field} className="bg-background" />
                  </FormControl>
                  <FormDescription>Avoid sharing a private home address.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="text-xs uppercase font-mono text-muted-foreground">Photo Evidence (Optional)</div>
              <div className="flex items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-muted-foreground overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{selectedFile ? selectedFile.name : "Select an image..."}</span>
                </Button>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-2" 
              disabled={isUploading || submitReport.isPending}
            >
              {isUploading || submitReport.isPending ? (
                <>
                  <UploadCloud className="w-4 h-4 mr-2 animate-bounce" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function NearbyParishes({ parishes, currentId, onSelect }: { parishes: any[], currentId: string, onSelect: (id: string) => void }) {
  const nearbyIds = PARISH_NEIGHBORS[currentId] ?? [];
  const others = nearbyIds.map((id) => parishes.find((parish) => parish.id === id)).filter(Boolean);
  
  if (others.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        <GlobeIcon className="w-4 h-4" />
        Nearby parishes
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {others.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="p-3 text-left border border-border rounded-md bg-card hover:border-primary/50 transition-colors group flex items-center justify-between"
          >
            <div>
              <div className="text-sm font-medium group-hover:text-primary transition-colors">{p.name}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-mono">Separate parish · {p.readinessLevel}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
