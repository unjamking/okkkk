import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useStore, formatBytes } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, FileText, FolderTree, Share2, BarChart3, LogOut,
  Moon, Sun, Menu, X, Activity, Trash2, Settings, Search, HardDrive, User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/command-palette";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/categories", label: "Categories", icon: FolderTree },
  { to: "/app/shared", label: "Shared", icon: Share2 },
  { to: "/app/activity", label: "Activity", icon: Activity },
  { to: "/app/stats", label: "Statistics", icon: BarChart3 },
  { to: "/app/trash", label: "Trash", icon: Trash2 },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

const STORAGE_QUOTA = 500 * 1024 * 1024; // 500 MB mock quota

function AppLayout() {
  const { auth, logout, docs } = useStore();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (hydrated && !auth.user) navigate({ to: "/" });
  }, [hydrated, auth.user, navigate]);

  const usage = useMemo(
    () => docs.filter((d) => d.ownerId === auth.user?.id && !d.trashedAt).reduce((sum, d) => sum + d.size, 0),
    [docs, auth.user?.id],
  );
  const usagePct = Math.min(100, (usage / STORAGE_QUOTA) * 100);
  const trashCount = useMemo(
    () => docs.filter((d) => d.ownerId === auth.user?.id && d.trashedAt).length,
    [docs, auth.user?.id],
  );

  if (!hydrated || !auth.user) {
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading…</div>;
  }

  const initials = auth.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-sidebar-border bg-sidebar transition-transform md:relative md:translate-x-0`}>
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">DocVault</span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="px-3 py-2 space-y-1 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const badge = item.to === "/app/trash" && trashCount > 0 ? trashCount : null;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  }`}>
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {badge !== null && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 space-y-3">
          <div className="rounded-xl border border-sidebar-border bg-card/50 p-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              Storage
            </div>
            <Progress value={usagePct} className="mt-2 h-1.5" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatBytes(usage)} of {formatBytes(STORAGE_QUOTA)}
            </p>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-medium text-muted-foreground capitalize">
            {nav.find((n) => path.startsWith(n.to))?.label ?? "Workspace"}
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono">{isMac ? "⌘" : "Ctrl"}K</kbd>
            </button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{auth.user.name}</span>
                      {auth.user.role === "admin" && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                          Admin
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{auth.user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
                  <User className="mr-2 h-4 w-4" /> Profile & settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { logout(); navigate({ to: "/" }); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
