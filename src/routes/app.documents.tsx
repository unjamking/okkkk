import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { useStore, formatBytes, type Doc } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, FileText, ImageIcon, Search, Trash2, LayoutGrid, List, Eye,
  Share2, History, Tag,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DocDetailDialog } from "@/components/doc-detail-dialog";

export const Route = createFileRoute("/app/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { docs, auth, addDoc, removeDoc, categories } = useStore();
  const myDocs = useMemo(() => docs.filter((d) => d.ownerId === auth.user?.id), [docs, auth.user?.id]);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<Doc | null>(null);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = myDocs.filter((d) => {
    const q = query.trim().toLowerCase();
    if (q && !d.name.toLowerCase().includes(q)) return false;
    if (categoryFilter !== "all" && !d.categoryIds.includes(categoryFilter)) return false;
    return true;
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const readable = file.type.startsWith("image/")
        || file.type.startsWith("text/")
        || file.type === "application/pdf"
        || file.type === "application/json"
        || file.type.startsWith("video/")
        || file.type.startsWith("audio/");
      let dataUrl: string | undefined;
      if (readable && file.size < 6_000_000) {
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }
      addDoc({ name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl });
    }
    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">{myDocs.length} files in your vault</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />
          <Button onClick={() => fileRef.current?.click()} className="bg-gradient-primary shadow-glow hover:opacity-90">
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`group cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragOver ? "border-primary bg-accent/40 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-accent/20"
        }`}
      >
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent transition ${dragOver ? "scale-110 bg-primary/20" : ""}`}>
          <Upload className={`h-5 w-5 transition ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <p className="text-sm font-medium">{dragOver ? "Drop files to upload" : "Drag & drop files here"}</p>
        <p className="mt-1 text-xs text-muted-foreground">or click to browse · multiple files supported</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…" className="pl-9" />
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "list")}>
          <TabsList>
            <TabsTrigger value="grid"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((c) => (
            <TabsTrigger key={c.id} value={c.id} className="gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
              {c.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No documents found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or upload a new file.</p>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((d) => (
            <DocCard key={d.id} doc={d} onOpen={() => setSelected(d)} onDelete={() => setConfirmDelete(d)} />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Size</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(d)} className="flex items-center gap-2 text-left">
                      {d.type.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium">{d.name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{formatBytes(d.size)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{format(d.uploadedAt, "MMM d, yyyy")}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelected(d)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(d)}><Trash2 className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) {
                  removeDoc(confirmDelete.id);
                  toast.success("Document deleted");
                }
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocDetailDialog doc={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function DocCard({ doc, onOpen, onDelete }: { doc: Doc; onOpen: () => void; onDelete: () => void }) {
  const { categories, bumpView } = useStore();
  const cats = categories.filter((c) => doc.categoryIds.includes(c.id));
  const isImg = doc.type.startsWith("image/");

  return (
    <Card className="group overflow-hidden shadow-card transition hover:-translate-y-0.5 hover:shadow-glow">
      <button onClick={() => { bumpView(doc.id); onOpen(); }} className="block w-full text-left">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {isImg && doc.dataUrl ? (
            <img src={doc.dataUrl} alt={doc.name} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-muted">
              <FileText className="h-10 w-10 text-muted-foreground/60" />
            </div>
          )}
          {(doc.sharedUserIds.length > 0 || doc.shareLinks.length > 0) && (
            <Badge className="absolute right-2 top-2 bg-background/80 text-foreground backdrop-blur"><Share2 className="mr-1 h-3 w-3" />Shared</Badge>
          )}
        </div>
      </button>
      <div className="p-4">
        <p className="truncate font-medium">{doc.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(doc.size)} · {format(doc.uploadedAt, "MMM d, yyyy")}</p>
        {cats.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {cats.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />{c.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Eye className="h-3 w-3" />{doc.views}</span>
          <div className="flex">
            <Button variant="ghost" size="icon" onClick={onOpen}><Tag className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onOpen}><History className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Re-export not needed; using shared component
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger };
