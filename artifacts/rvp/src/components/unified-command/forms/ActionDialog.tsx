import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useApplyUnifiedCommandAction, getGetUnifiedCommandWorkspaceQueryKey } from "@workspace/api-client-react";
import { useRole } from "@/contexts/RoleContext";
import { useQueryClient } from "@tanstack/react-query";

type UnifiedCommandActionType =
  | "create_objective"
  | "update_objective"
  | "create_aid"
  | "update_aid"
  | "confirm_aid"
  | "post_message"
  | "acknowledge_message"
  | "update_agency"
  | "update_boundary"
  | "invite_member"
  | "update_member";

export function ActionDialog({
  workspaceId, open, onOpenChange, type, initialData, title, fields
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: UnifiedCommandActionType;
  initialData?: any;
  title: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text'|'textarea'|'number'|'select'|'datetime-local';
    options?: string[];
    required?: boolean;
    defaultValue?: string | number;
    min?: number;
    max?: number;
    step?: number;
  }>;
}) {
  const { role } = useRole();
  const queryClient = useQueryClient();
  const [formError, setFormError] = React.useState("");
  const applyAction = useApplyUnifiedCommandAction({
  });

  React.useEffect(() => {
    if (open) setFormError("");
  }, [open]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    const formData = new FormData(e.currentTarget);
    const data: any = { type };
    if (initialData?.id) data.recordId = initialData.id;

    fields.forEach(f => {
      const val = formData.get(f.name);
      if (val !== null && val !== "") {
        if (f.type === 'number') data[f.name] = Number(val);
        else if (f.type === 'datetime-local') data[f.name] = new Date(val.toString()).toISOString();
        else data[f.name] = val.toString();
      }
    });

    applyAction.mutate({ workspaceId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetUnifiedCommandWorkspaceQueryKey(workspaceId) });
        onOpenChange(false);
      },
      onError: (error) => {
        const message = error && typeof error === "object"
          ? (error as { data?: { error?: string } }).data?.error
          : null;
        setFormError(message || "The operational update could not be recorded. Review the evidence and try again.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-border bg-card">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="font-mono uppercase">{title}</DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">Complete the operational parameters. Required evidence is validated by the server.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {fields.map(f => (
              <div key={f.name} className="flex flex-col gap-2">
                <Label htmlFor={f.name} className="font-mono text-[10px] uppercase text-muted-foreground">{f.label}</Label>
                {f.type === 'textarea' ? (
                   <Textarea id={f.name} name={f.name} defaultValue={initialData?.[f.name] ?? f.defaultValue ?? ''} required={f.required} className="bg-background font-mono text-xs rounded-sm resize-none" rows={3} />
                ) : f.type === 'select' ? (
                   <select id={f.name} name={f.name} defaultValue={initialData?.[f.name] ?? f.defaultValue ?? f.options?.[0]} required={f.required} className="flex h-9 w-full rounded-sm border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 font-mono">
                    {f.options?.map(opt => <option key={opt} value={opt} className="bg-background text-foreground">{opt.replace(/_/g, ' ')}</option>)}
                  </select>
                ) : (
                   <Input
                     id={f.name}
                     name={f.name}
                     type={f.type}
                     defaultValue={initialData?.[f.name] ?? f.defaultValue ?? ''}
                     required={f.required}
                     min={f.min}
                     max={f.max}
                     step={f.step}
                     className="bg-background font-mono text-xs rounded-sm"
                   />
                )}
              </div>
            ))}
             {formError && (
               <div role="alert" className="border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                 {formError}
               </div>
             )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="font-mono uppercase text-[10px] tracking-wider" disabled={applyAction.isPending}>Cancel</Button>
            <Button type="submit" className="font-mono uppercase text-[10px] tracking-wider bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30" disabled={applyAction.isPending}>
              {applyAction.isPending ? 'Committing...' : 'Commit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}