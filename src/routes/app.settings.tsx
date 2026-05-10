import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Save, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { auth, updateProfile } = useStore();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState(auth.user?.name ?? "");
  const [email, setEmail] = useState(auth.user?.email ?? "");
  const [password, setPassword] = useState("");

  if (!auth.user) return null;
  const initials = auth.user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { toast.error("Name and email are required"); return; }
    updateProfile({ name: name.trim(), email: email.trim() });
    setPassword("");
    toast.success("Profile updated");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences.</p>
      </div>

      <Card className="p-6 shadow-card">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{auth.user.name}</p>
            <p className="text-sm text-muted-foreground">{auth.user.email}</p>
          </div>
        </div>

        <form onSubmit={onSave} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" placeholder="Leave blank to keep current" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">Mock-only — passwords are not stored in this preview.</p>
          </div>
          <Button type="submit" className="bg-gradient-primary shadow-glow hover:opacity-90">
            <Save className="mr-2 h-4 w-4" /> Save changes
          </Button>
        </form>
      </Card>

      <Card className="p-6 shadow-card">
        <h2 className="font-semibold flex items-center gap-2"><UserIcon className="h-4 w-4" /> Preferences</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
          </div>
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
            <Switch checked={theme === "dark"} onCheckedChange={toggle} />
          </div>
        </div>
      </Card>
    </div>
  );
}
