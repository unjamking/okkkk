import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import {
  LayoutDashboard, FileText, FolderTree, Share2, BarChart3, Activity,
  Trash2, Settings, Star, Upload, Sun, Moon, LogOut,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { docs, auth, recordOpen, toggleStar, logout } = useStore();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        navigate({ to: "/app/documents" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const myDocs = docs.filter((d) => d.ownerId === auth.user?.id && !d.trashedAt).slice(0, 8);

  const go = (to: string) => { setOpen(false); navigate({ to }); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search documents, jump to a page…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {myDocs.length > 0 && (
          <CommandGroup heading="Documents">
            {myDocs.map((d) => (
              <CommandItem
                key={d.id}
                value={`doc ${d.name}`}
                onSelect={() => { setOpen(false); recordOpen(d.id); navigate({ to: "/app/documents" }); }}
              >
                <FileText className="h-4 w-4" />
                <span>{d.name}</span>
                {d.starred && <Star className="ml-auto h-3 w-3 fill-current text-chart-4" />}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/app/dashboard")}><LayoutDashboard /> Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/app/documents")}><FileText /> Documents <CommandShortcut>U</CommandShortcut></CommandItem>
          <CommandItem onSelect={() => go("/app/categories")}><FolderTree /> Categories</CommandItem>
          <CommandItem onSelect={() => go("/app/shared")}><Share2 /> Shared</CommandItem>
          <CommandItem onSelect={() => go("/app/activity")}><Activity /> Activity</CommandItem>
          <CommandItem onSelect={() => go("/app/stats")}><BarChart3 /> Statistics</CommandItem>
          <CommandItem onSelect={() => go("/app/trash")}><Trash2 /> Trash</CommandItem>
          <CommandItem onSelect={() => go("/app/settings")}><Settings /> Settings</CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { setOpen(false); navigate({ to: "/app/documents" }); }}>
            <Upload /> Upload files
          </CommandItem>
          <CommandItem onSelect={() => { toggle(); setOpen(false); }}>
            {theme === "dark" ? <Sun /> : <Moon />} Toggle theme
          </CommandItem>
          {myDocs[0] && (
            <CommandItem onSelect={() => { toggleStar(myDocs[0].id); setOpen(false); }}>
              <Star /> {myDocs[0].starred ? "Unstar" : "Star"} "{myDocs[0].name}"
            </CommandItem>
          )}
          <CommandItem onSelect={() => { logout(); setOpen(false); navigate({ to: "/" }); }}>
            <LogOut /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
