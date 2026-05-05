import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, formatBytes, type Doc } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, FileText, ImageIcon, Link2, Users, Eye } from "lucide-react";
import { format } from "date-fns";
import { DocDetailDialog } from "@/components/doc-detail-dialog";

export const Route = createFileRoute("/app/shared")({
  component: SharedPage,
});

function SharedPage() {
  const { docs, users, auth } = useStore();
  const [tab, setTab] = useState("by-me");
  const [selected, setSelected] = useState<Doc | null>(null);

  const sharedByMe = docs.filter((d) => d.ownerId === auth.user?.id && (d.sharedUserIds.length > 0 || d.shareLinks.length > 0));
  const sharedWithMe = docs.filter((d) => d.ownerId !== auth.user?.id && d.sharedUserIds.includes(auth.user?.id ?? ""));
  const list = tab === "by-me" ? sharedByMe : sharedWithMe;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Sharing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track who has access to your documents.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="by-me"><Share2 className="mr-1 h-3 w-3" />Shared by me ({sharedByMe.length})</TabsTrigger>
          <TabsTrigger value="with-me"><Users className="mr-1 h-3 w-3" />Shared with me ({sharedWithMe.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <Share2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Nothing shared {tab === "by-me" ? "yet" : "with you"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Open any document to invite people or generate a link.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {list.map((d) => {
            const sharedUsers = users.filter((u) => d.sharedUserIds.includes(u.id));
            return (
              <Card key={d.id} className="p-4 shadow-card hover:shadow-glow transition cursor-pointer" onClick={() => setSelected(d)}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
                    {d.type.startsWith("image/") ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(d.size)} · {format(d.uploadedAt, "MMM d, yyyy")}</p>
                  </div>
                  {sharedUsers.length > 0 && (
                    <div className="flex -space-x-2">
                      {sharedUsers.slice(0, 4).map((u) => (
                        <Avatar key={u.id} className="h-7 w-7 border-2 border-background">
                          <AvatarFallback className="text-[10px] bg-gradient-primary text-primary-foreground">
                            {u.name.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {sharedUsers.length > 4 && (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">+{sharedUsers.length - 4}</span>
                      )}
                    </div>
                  )}
                  {d.shareLinks.length > 0 && (
                    <Badge className="bg-success text-success-foreground"><Link2 className="mr-1 h-3 w-3" />{d.shareLinks.length} link{d.shareLinks.length > 1 ? "s" : ""}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Eye className="h-3 w-3" />{d.views}</span>
                  <Button variant="outline" size="sm">Manage</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <DocDetailDialog doc={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
