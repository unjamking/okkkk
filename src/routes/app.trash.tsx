import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, formatBytes, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw, FileText, Flame } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/app/trash")({
  component: TrashPage,
});

const RETENTION_DAYS = 30;

function TrashPage() {
  const { docs, auth, restoreDoc, purgeDoc, emptyTrash } = useStore();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState<Doc | null>(null);

  const trashed = useMemo(
    () => docs
      .filter((d) => d.ownerId === auth.user?.id && d.trashedAt)
      .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0)),
    [docs, auth.user?.id],
  );

  const daysLeft = (d: Doc) => {
    const ms = (d.trashedAt ?? 0) + RETENTION_DAYS * 86400000 - Date.now();
    return Math.max(0, Math.ceil(ms / 86400000));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Trash</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Items are permanently deleted after {RETENTION_DAYS} days · {trashed.length} item{trashed.length === 1 ? "" : "s"}
          </p>
        </div>
        {trashed.length > 0 && (
          <Button variant="destructive" onClick={() => setConfirmEmpty(true)}>
            <Flame className="mr-2 h-4 w-4" /> Empty trash
          </Button>
        )}
      </div>

      {trashed.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <Trash2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Trash is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Deleted documents will appear here.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Size</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Deleted</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Auto-purge</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trashed.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatBytes(d.size)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {d.trashedAt ? formatDistanceToNow(d.trashedAt, { addSuffix: true }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    in {daysLeft(d)} day{daysLeft(d) === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => { restoreDoc(d.id); toast.success(`Restored "${d.name}"`); }}
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" /> Restore
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmPurge(d)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <AlertDialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty trash?</AlertDialogTitle>
            <AlertDialogDescription>
              All {trashed.length} item{trashed.length === 1 ? "" : "s"} in trash will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { emptyTrash(); toast.success("Trash emptied"); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Empty trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmPurge} onOpenChange={(o) => !o && setConfirmPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmPurge?.name}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmPurge) { purgeDoc(confirmPurge.id); toast.success("Permanently deleted"); }
                setConfirmPurge(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
