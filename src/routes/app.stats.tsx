import { createFileRoute } from "@tanstack/react-router";
import { useStore, formatBytes } from "@/lib/store";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { format, subDays } from "date-fns";
import { Eye, FileText, Upload, HardDrive } from "lucide-react";

export const Route = createFileRoute("/app/stats")({
  component: StatsPage,
});

function StatsPage() {
  const { docs, categories, auth } = useStore();
  const myDocs = docs.filter((d) => d.ownerId === auth.user?.id);

  const uploadsByDay = Array.from({ length: 14 }).map((_, i) => {
    const day = subDays(new Date(), 13 - i);
    const count = myDocs.filter((d) => format(d.uploadedAt, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")).length;
    return { day: format(day, "MMM d"), uploads: count };
  });

  const byCategory = categories.map((c) => ({
    name: c.name,
    value: myDocs.filter((d) => d.categoryIds.includes(c.id)).length,
    color: c.color,
  })).filter((c) => c.value > 0);

  const topViewed = [...myDocs].sort((a, b) => b.views - a.views).slice(0, 5).map((d) => ({
    name: d.name.length > 20 ? d.name.slice(0, 18) + "…" : d.name,
    views: d.views,
  }));

  const totalViews = myDocs.reduce((s, d) => s + d.views, 0);
  const totalSize = myDocs.reduce((s, d) => s + d.size, 0);

  const stats = [
    { label: "Documents", value: myDocs.length, icon: FileText },
    { label: "Storage", value: formatBytes(totalSize), icon: HardDrive },
    { label: "Total views", value: totalViews, icon: Eye },
    { label: "Uploads (14d)", value: uploadsByDay.reduce((s, d) => s + d.uploads, 0), icon: Upload },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Statistics</h1>
        <p className="mt-1 text-sm text-muted-foreground">A look at your activity and library.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 shadow-card">
          <h3 className="font-semibold">Uploads — last 14 days</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={uploadsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
                <Line type="monotone" dataKey="uploads" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: "var(--primary)", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 shadow-card">
          <h3 className="font-semibold">Documents by category</h3>
          {byCategory.length === 0 ? (
            <p className="mt-12 text-center text-sm text-muted-foreground">No categorized documents yet.</p>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5 shadow-card lg:col-span-2">
          <h3 className="font-semibold">Most viewed documents</h3>
          {topViewed.length === 0 ? (
            <p className="mt-12 text-center text-sm text-muted-foreground">No views recorded yet.</p>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topViewed} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={140} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} />
                  <Bar dataKey="views" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
