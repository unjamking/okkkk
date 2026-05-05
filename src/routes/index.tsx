import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { FileText, Share2, Layers, History, Sparkles, Shield, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { auth } = useStore();
  const { theme, toggle } = useTheme();
  if (auth.user) return <Navigate to="/app/dashboard" />;

  const features = [
    { icon: FileText, title: "Smart documents", desc: "Drag & drop uploads with instant preview." },
    { icon: Layers, title: "Organize", desc: "Tag with categories, filter in one click." },
    { icon: Share2, title: "Share anywhere", desc: "Invite users or send time-limited links." },
    { icon: History, title: "Version history", desc: "Roll back to any prior version, anytime." },
    { icon: Shield, title: "Built for trust", desc: "Granular access. You stay in control." },
    { icon: Sparkles, title: "Beautiful by default", desc: "Crafted UI in light and dark themes." },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-chart-2/20 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight">DocVault</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
          <Button asChild className="bg-gradient-primary hover:opacity-90"><Link to="/register">Get started</Link></Button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-12 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3 w-3 text-primary" /> A calmer way to manage documents
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
          Your documents, <span className="text-gradient">beautifully organized.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          DocVault is a modern home for your files — upload, categorize, share, and track versions in a workspace that feels instant.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
            <Link to="/register">Create free account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition group-hover:bg-gradient-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DocVault. Crafted with care.
      </footer>
    </div>
  );
}
