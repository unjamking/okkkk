import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, formatBytes } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { FileText, Upload, Share2, Eye, ArrowUpRight, ImageIcon } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, subDays } from "date-fns";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { docs, auth } = useStore();
  const myDocs = docs.filter((d) => d.ownerId === auth.user?.id && !d.trashedAt);
  const total = myDocs.length;
  const totalSize = myDocs.reduce((s, d) => s + d.size, 0);
  const recent = [...myDocs].sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 5);
  const sharedCount = myDocs.filter((d) => d.sharedUserIds.length > 0 || d.shareLinks.length > 0).length;
  const totalViews = myDocs.reduce((s, d) => s + d.views, 0);

  const chart = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(new Date(), 6 - i);
    const count = myDocs.filter((d) => format(d.uploadedAt, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")).length;
    return { day: format(day, "EEE"), uploads: count };
  });

  const stats = [
    { label: "Total documents", value: total, icon: FileText, accent: "from-chart-1 to-chart-2" },
    { label: "Storage used", value: formatBytes(totalSize), icon: Upload, accent: "from-chart-3 to-chart-1" },
    { label: "Shared", value: sharedCount, icon: Share2, accent: "from-chart-2 to-chart-5" },
    { label: "Total views", value: totalViews, icon: Eye, accent: "from-chart-4 to-chart-5" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Welcome back, {auth.user?.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's what's happening in your workspace.</p>
        </div>
        <Link to="/app/documents" className="inline-flex items-center gap-1 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90">
          <Upload className="h-4 w-4" /> Upload
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="relative overflow-hidden p-5 shadow-card">
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.accent} opacity-15 blur-2xl`} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Uploads — last 7 days</h3>
            <Link to="/app/stats" className="text-xs text-primary hover:underline inline-flex items-center gap-1">More <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
                <Bar dataKey="uploads" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recent uploads</h3>
            <Link to="/app/documents" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyDocs />
          ) : (
            <ul className="mt-4 space-y-2">
              {recent.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/60">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    {d.type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(d.size)} · {format(d.uploadedAt, "MMM d")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyDocs() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border p-6 text-center">
      <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">No uploads yet.</p>
      <Link to="/app/documents" className="mt-2 inline-block text-xs text-primary hover:underline">Upload your first file</Link>
    </div>
  );
}
