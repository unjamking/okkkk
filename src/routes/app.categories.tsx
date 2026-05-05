import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";

const PALETTE = [
  "oklch(0.62 0.16 195)",
  "oklch(0.7 0.18 280)",
  "oklch(0.75 0.16 155)",
  "oklch(0.82 0.14 75)",
  "oklch(0.7 0.2 20)",
  "oklch(0.65 0.18 320)",
];

export const Route = createFileRoute("/app/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { categories, addCategory, removeCategory, docs, auth } = useStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const myDocs = docs.filter((d) => d.ownerId === auth.user?.id);
  const counts = (id: string) => myDocs.filter((d) => d.categoryIds.includes(id)).length;

  const create = () => {
    if (!name.trim()) return toast.error("Name is required");
    addCategory(name.trim(), color);
    setName("");
    toast.success("Category created");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organize your documents into focused groups.</p>
      </div>

      <Card className="p-5 shadow-card">
        <h3 className="font-semibold">New category</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contracts" className="max-w-xs" onKeyDown={(e) => e.key === "Enter" && create()} />
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ background: c }} aria-label={`Pick color`} />
            ))}
          </div>
          <Button onClick={create} className="bg-gradient-primary hover:opacity-90 ml-auto">
            <Plus className="mr-1 h-4 w-4" /> Create
          </Button>
        </div>
      </Card>

      {categories.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <FolderTree className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No categories yet</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="p-4 flex items-center gap-3 shadow-card">
              <span className="h-10 w-10 rounded-xl shrink-0" style={{ background: c.color, opacity: 0.85 }} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{counts(c.id)} document{counts(c.id) === 1 ? "" : "s"}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setConfirmDel(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>Documents will not be deleted, but they'll lose this category tag.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirmDel) { removeCategory(confirmDel); toast.success("Category removed"); } setConfirmDel(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
