import { useGetUnifiedCommandWorkspace, getGetUnifiedCommandWorkspaceQueryKey } from "@workspace/api-client-react";
import { useRole } from "@/contexts/RoleContext";
import { AlertTriangle, Loader2 } from "lucide-react";
import { WorkspaceView } from "@/components/unified-command/WorkspaceView";

export default function UnifiedCommand() {
  const { role, isAuthorityLoading } = useRole();
  const workspaceId = "jamaica-national-response";
  const workspaceQueryKey = [...getGetUnifiedCommandWorkspaceQueryKey(workspaceId), role] as const;

  const { data: workspace, isLoading, isError, error } = useGetUnifiedCommandWorkspace(
    workspaceId,
    {
      query: {
        enabled: !isAuthorityLoading,
        retry: 1,
        queryKey: workspaceQueryKey,
        refetchInterval: 30_000,
      },
    }
  );

  if (isAuthorityLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="font-mono text-xs uppercase tracking-widest">Initializing Unified Command...</div>
        </div>
      </div>
    );
  }

  if (isError || !workspace) {
    const errorStatus = (error as any)?.status ?? (error as any)?.response?.status;
    const isUnauthorized = errorStatus === 401 || errorStatus === 403;

    return (
      <div className="flex h-full items-center justify-center p-6 bg-background">
        <div className="flex max-w-md flex-col items-center text-center gap-4 border border-destructive/50 bg-destructive/10 p-8 rounded-md">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h2 className="font-mono text-lg uppercase text-destructive">
            {isUnauthorized ? "Clearance Denied" : "System Error"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isUnauthorized
              ? "The selected demo role does not have authorization to access this workspace."
              : "Failed to establish connection with the operational picture. Verify network status and retry."}
          </p>
        </div>
      </div>
    );
  }

  return <WorkspaceView workspace={workspace} />;
}