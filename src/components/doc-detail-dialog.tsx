import { useMemo, useState } from "react";
import { useStore, formatBytes, type Doc } from "@/lib/store";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FileText, ImageIcon, Link2, Copy, Trash2, Plus, History,
  Users, Tag, RotateCcw, Check,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function DocDetailDialog({ doc, onClose }: { doc: Doc | null; onClose: () => void }) {
  const {
    users, categories, auth, updateDoc, addVersion, restoreVersion,
    createShareLink, removeShareLink, shareWithUsers, unshareUser,
  } = useStore();

  const [shareSearch, setShareSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [expiry, setExpiry] = useState<number | null>(7);
  const [versionNote, setVersionNote] = useState("");

  const candidateUsers = useMemo(() => {
    if (!doc) return [];
    return users
      .filter((u) => u.id !== auth.user?.id)
      .filter((u) => !doc.sharedUserIds.includes(u.id))
      .filter((u) => u.name.toLowerCase().includes(shareSearch.toLowerCase()) || u.email.toLowerCase().includes(shareSearch.toLowerCase()));
  }, [users, doc, auth.user?.id, shareSearch]);

  if (!doc) return null;
  const isImg = doc.type.startsWith("image/");
  const sharedUsers = users.filter((u) => doc.sharedUserIds.includes(u.id));
  const currentVersion = doc.versions[0];

  const toggleCategory = (catId: string) => {
    const has = doc.categoryIds.includes(catId);
    updateDoc(doc.id, { categoryIds: has ? doc.categoryIds.filter((c) => c !== catId) : [...doc.categoryIds, catId] });
  };

  const handleShare = () => {
    if (selectedUsers.length === 0) return toast.error("Pick at least one user");
    shareWithUsers(doc.id, selectedUsers);
    toast.success(`Shared with ${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""}`);
    setSelectedUsers([]);
  };

  const handleCopy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    catch { toast.error("Couldn't copy"); }
  };

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            {isImg ? <ImageIcon className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
            <span className="truncate">{doc.name}</span>
          </DialogTitle>
          <DialogDescription>
            {formatBytes(doc.size)} · uploaded {format(doc.uploadedAt, "PPP")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 overflow-y-auto flex-1">
          {isImg && doc.dataUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted">
              <img src={doc.dataUrl} alt={doc.name} className="max-h-72 w-full object-contain" />
            </div>
          )}

          <Tabs defaultValue="categories" className="mt-4 pb-6">
            <TabsList>
              <TabsTrigger value="categories"><Tag className="mr-1 h-3 w-3" />Categories</TabsTrigger>
              <TabsTrigger value="share"><Users className="mr-1 h-3 w-3" />Sharing</TabsTrigger>
              <TabsTrigger value="links"><Link2 className="mr-1 h-3 w-3" />Links</TabsTrigger>
              <TabsTrigger value="versions"><History className="mr-1 h-3 w-3" />Versions</TabsTrigger>
            </TabsList>

            <TabsContent value="categories" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Assign one or more categories to this document.</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = doc.categoryIds.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleCategory(c.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                        active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                      }`}>
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
                {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
              </div>
            </TabsContent>

            <TabsContent value="share" className="mt-4 space-y-4">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">People with access</Label>
                {sharedUsers.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Only you can see this document.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sharedUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 pr-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                            {u.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{u.name}</span>
                        <button onClick={() => unshareUser(doc.id, u.id)} className="rounded-full p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border p-4">
                <Label className="text-xs uppercase text-muted-foreground">Invite users (multi-select)</Label>
                <Input value={shareSearch} onChange={(e) => setShareSearch(e.target.value)} placeholder="Search by name or email…" className="mt-2" />
                <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
                  {candidateUsers.length === 0 && <p className="text-sm text-muted-foreground py-2">No matching users.</p>}
                  {candidateUsers.map((u) => {
                    const checked = selectedUsers.includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={(v) => {
                          setSelectedUsers((s) => v ? [...s, u.id] : s.filter((id) => id !== u.id));
                        }} />
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                            {u.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <Button onClick={handleShare} className="mt-3 w-full bg-gradient-primary hover:opacity-90" disabled={selectedUsers.length === 0}>
                  <Plus className="mr-1 h-4 w-4" /> Share with {selectedUsers.length || 0} user{selectedUsers.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="links" className="mt-4 space-y-4">
              <div className="rounded-xl border border-border p-4">
                <Label className="text-xs uppercase text-muted-foreground">Generate share link</Label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[null, 1, 7, 30].map((v) => (
                    <button key={String(v)} onClick={() => setExpiry(v)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        expiry === v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                      }`}>
                      {v === null ? "No expiry" : `${v} day${v > 1 ? "s" : ""}`}
                    </button>
                  ))}
                  <Button onClick={() => { createShareLink(doc.id, expiry); toast.success("Link created"); }} className="ml-auto bg-gradient-primary hover:opacity-90">
                    <Plus className="mr-1 h-4 w-4" /> Create link
                  </Button>
                </div>
              </div>

              {doc.shareLinks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active links.</p>
              ) : (
                <div className="space-y-2">
                  {doc.shareLinks.map((l) => {
                    const expired = l.expiresAt && l.expiresAt < Date.now();
                    return (
                      <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-mono text-xs">{l.url}</p>
                          <div className="mt-1 flex items-center gap-2">
                            {expired ? (
                              <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                            ) : l.expiresAt ? (
                              <Badge className="bg-success text-success-foreground text-[10px]">Active · expires {formatDistanceToNow(l.expiresAt)}</Badge>
                            ) : (
                              <Badge className="bg-success text-success-foreground text-[10px]">Active · no expiry</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(l.url)}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { removeShareLink(doc.id, l.id); toast.success("Link revoked"); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="versions" className="mt-4 space-y-4">
              <div className="rounded-xl border border-border p-4">
                <Label className="text-xs uppercase text-muted-foreground">New version</Label>
                <div className="mt-3 flex gap-2">
                  <Input value={versionNote} onChange={(e) => setVersionNote(e.target.value)} placeholder="What changed?" />
                  <Button onClick={() => {
                    if (!versionNote.trim()) return toast.error("Add a note");
                    addVersion(doc.id, versionNote.trim());
                    setVersionNote("");
                    toast.success("Version saved");
                  }} className="bg-gradient-primary hover:opacity-90">
                    <Plus className="mr-1 h-4 w-4" /> Save
                  </Button>
                </div>
              </div>

              <ol className="relative space-y-4 border-l border-border pl-6">
                {doc.versions.map((v, i) => {
                  const isCurrent = v.id === currentVersion.id;
                  return (
                    <li key={v.id} className="relative">
                      <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 ${
                        isCurrent ? "border-primary bg-primary shadow-glow" : "border-border bg-background"
                      }`} />
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{v.note}</p>
                            {isCurrent && <Badge className="bg-primary/15 text-primary text-[10px]">Current</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{format(v.createdAt, "PPp")} · {formatBytes(v.size)}</p>
                        </div>
                        {!isCurrent && (
                          <Button size="sm" variant="outline" onClick={() => { restoreVersion(doc.id, v.id); toast.success("Version restored"); }}>
                            <RotateCcw className="mr-1 h-3 w-3" /> Restore
                          </Button>
                        )}
                      </div>
                      {i === 0 && doc.versions.length === 1 && (
                        <p className="mt-1 text-xs text-muted-foreground">No prior versions yet — save changes above to start a history.</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
