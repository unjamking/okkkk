import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Activity as ActivityIcon, Upload, Trash2, Eye, Share2, Link2, History,
  RotateCcw, Tag, LogIn, UserPlus, FolderOpen,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState, useMemo } from "react";
import type { ActivityKind } from "@/lib/store";

export const Route = createFileRoute("/app/activity")({
  component: ActivityPage,
});

const ICONS: Record<ActivityKind, React.ComponentType<{ className?: string }>> = {
  upload: Upload, delete: Trash2, open: FolderOpen, view: Eye,
  "share-user": Share2, "unshare-user": Share2,
  "share-link-create": Link2, "share-link-revoke": Link2,
  "version-save": History, "version-restore": RotateCcw,
  "category-change": Tag, login: LogIn, register: UserPlus,
};

const LABELS: Record<ActivityKind, string> = {
  upload: "Uploaded", delete: "Deleted", open: "Opened", view: "Viewed",
  "share-user": "Shared", "unshare-user": "Removed access",
  "share-link-create": "Created link", "share-link-revoke": "Revoked link",
  "version-save": "New version", "version-restore": "Restored version",
  "category-change": "Category", login: "Signed in", register: "Created account",
};

const TONE: Record<ActivityKind, string> = {
  upload: "text-chart-1", delete: "text-destructive",
  open: "text-chart-2", view: "text-muted-foreground",
  "share-user": "text-chart-3", "unshare-user": "text-chart-3",
  "share-link-create": "text-chart-4", "share-link-revoke": "text-chart-4",
  "version-save": "text-chart-5", "version-restore": "text-chart-5",
  "category-change": "text-primary", login: "text-muted-foreground", register: "text-muted-foreground",
};

function ActivityPage() {
  const { activities, auth, users } = useStore();
  const [filter, setFilter] = useState<"mine" | "all">("mine");

  const list = useMemo(() => {
    const items = filter === "mine"
      ? activities.filter((a) => a.userId === auth.user?.id)
      : activities;
    return [...items].sort((a, b) => b.at - a.at);
  }, [activities, filter, auth.user?.id]);

  // group by day
  const groups = useMemo(() => {
    const map = new Map<string, typeof list>();
    for (const a of list) {
      const k = format(a.at, "yyyy-MM-dd");
      const arr = map.get(k);
      if (arr) arr.push(a); else map.set(k, [a]);
    }
    return Array.from(map.entries());
  }, [list]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">A live timeline of everything happening in your workspace.</p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "mine" | "all")}>
        <TabsList>
          <TabsTrigger value="mine">Mine</TabsTrigger>
          <TabsTrigger value="all">Everyone</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <Card className="p-12 text-center shadow-card">
          <ActivityIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Upload, share or version a document to see it appear here.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                {format(new Date(day), "EEEE, MMMM d")}
              </p>
              <Card className="shadow-card divide-y divide-border overflow-hidden">
                {items.map((a) => {
                  const Icon = ICONS[a.kind];
                  const u = users.find((x) => x.id === a.userId);
                  const initials = u?.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";
                  return (
                    <div key={a.id} className="flex items-start gap-3 p-4 hover:bg-accent/40 transition">
                      <Avatar className="h-8 w-8 mt-0.5">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[10px]">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{u?.name ?? "Someone"}</span>{" "}
                          <span className={TONE[a.kind]}>{LABELS[a.kind].toLowerCase()}</span>
                          {a.docName && <> <span className="font-medium">{a.docName}</span></>}
                        </p>
                        {a.meta && <p className="mt-0.5 text-xs text-muted-foreground">{a.meta}</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground">{formatDistanceToNow(a.at, { addSuffix: true })}</p>
                      </div>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-accent shrink-0 ${TONE[a.kind]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
