import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type User = { id: string; email: string; name: string; avatar?: string };
export type Category = { id: string; name: string; color: string };
export type Version = { id: string; createdAt: number; note: string; size: number };
export type ShareLink = { id: string; url: string; expiresAt: number | null; createdAt: number };
export type Doc = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  views: number;
  dataUrl?: string; // for images
  categoryIds: string[];
  sharedUserIds: string[];
  shareLinks: ShareLink[];
  versions: Version[];
  ownerId: string;
};

type Auth = { user: User | null; token: string | null };

type Ctx = {
  auth: Auth;
  users: User[];
  docs: Doc[];
  categories: Category[];
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  addDoc: (d: Omit<Doc, "id" | "uploadedAt" | "views" | "categoryIds" | "sharedUserIds" | "shareLinks" | "versions" | "ownerId">) => Doc;
  removeDoc: (id: string) => void;
  updateDoc: (id: string, patch: Partial<Doc>) => void;
  addCategory: (name: string, color: string) => void;
  removeCategory: (id: string) => void;
  addVersion: (docId: string, note: string) => void;
  restoreVersion: (docId: string, versionId: string) => void;
  bumpView: (docId: string) => void;
  createShareLink: (docId: string, expiresInDays: number | null) => ShareLink;
  removeShareLink: (docId: string, linkId: string) => void;
  shareWithUsers: (docId: string, userIds: string[]) => void;
  unshareUser: (docId: string, userId: string) => void;
};

const StoreContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "docvault.state.v1";
const AUTH_KEY = "docvault.auth.v1";

const seedUsers: User[] = [
  { id: "u1", email: "alex@docvault.io", name: "Alex Rivera" },
  { id: "u2", email: "maya@docvault.io", name: "Maya Chen" },
  { id: "u3", email: "jordan@docvault.io", name: "Jordan Lee" },
  { id: "u4", email: "sam@docvault.io", name: "Sam Patel" },
  { id: "u5", email: "kai@docvault.io", name: "Kai Tanaka" },
];

const seedCategories: Category[] = [
  { id: "c1", name: "Work", color: "oklch(0.62 0.16 195)" },
  { id: "c2", name: "Personal", color: "oklch(0.7 0.18 280)" },
  { id: "c3", name: "Finance", color: "oklch(0.75 0.16 155)" },
  { id: "c4", name: "Design", color: "oklch(0.82 0.14 75)" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function seedDocs(ownerId: string): Doc[] {
  const now = Date.now();
  return [
    {
      id: uid(), name: "Q3 Roadmap.pdf", type: "application/pdf", size: 1_240_000,
      uploadedAt: now - 86400000, views: 12, categoryIds: ["c1"], sharedUserIds: ["u2"],
      shareLinks: [], versions: [{ id: uid(), createdAt: now - 86400000, note: "Initial", size: 1_240_000 }],
      ownerId,
    },
    {
      id: uid(), name: "Brand Guidelines.png", type: "image/png", size: 540_000,
      uploadedAt: now - 3 * 86400000, views: 28, categoryIds: ["c4"], sharedUserIds: ["u3", "u4"],
      shareLinks: [], versions: [{ id: uid(), createdAt: now - 3 * 86400000, note: "v1", size: 540_000 }],
      ownerId,
    },
    {
      id: uid(), name: "Tax Receipt 2025.pdf", type: "application/pdf", size: 320_000,
      uploadedAt: now - 7 * 86400000, views: 4, categoryIds: ["c3"], sharedUserIds: [],
      shareLinks: [], versions: [{ id: uid(), createdAt: now - 7 * 86400000, note: "Initial", size: 320_000 }],
      ownerId,
    },
    {
      id: uid(), name: "Team Photo.jpg", type: "image/jpeg", size: 890_000,
      uploadedAt: now - 14 * 86400000, views: 19, categoryIds: ["c2", "c1"], sharedUserIds: ["u2", "u3", "u5"],
      shareLinks: [], versions: [{ id: uid(), createdAt: now - 14 * 86400000, note: "Original", size: 890_000 }],
      ownerId,
    },
  ];
}

type Persisted = { users: User[]; docs: Doc[]; categories: Category[] };

function loadState(): Persisted {
  if (typeof window === "undefined") return { users: seedUsers, docs: [], categories: seedCategories };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { users: seedUsers, docs: [], categories: seedCategories };
}

function loadAuth(): Auth {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { user: null, token: null };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => loadState());
  const [auth, setAuth] = useState<Auth>(() => loadAuth());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setAuth(loadAuth());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }, [auth, hydrated]);

  const login = useCallback(async (email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 400));
    let user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = { id: uid(), email, name: email.split("@")[0] };
      setState((s) => ({ ...s, users: [...s.users, user!] }));
    }
    setAuth({ user, token: uid() });
    setState((s) => (s.docs.some((d) => d.ownerId === user!.id) ? s : { ...s, docs: [...s.docs, ...seedDocs(user!.id)] }));
  }, [state.users]);

  const register = useCallback(async (name: string, email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 400));
    const existing = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error("An account with that email already exists.");
    const user: User = { id: uid(), email, name };
    setState((s) => ({ ...s, users: [...s.users, user], docs: [...s.docs, ...seedDocs(user.id)] }));
    setAuth({ user, token: uid() });
  }, [state.users]);

  const logout = useCallback(() => setAuth({ user: null, token: null }), []);

  const addDoc: Ctx["addDoc"] = useCallback((d) => {
    const ownerId = auth.user?.id ?? "anon";
    const doc: Doc = {
      ...d, id: uid(), uploadedAt: Date.now(), views: 0,
      categoryIds: [], sharedUserIds: [], shareLinks: [],
      versions: [{ id: uid(), createdAt: Date.now(), note: "Initial upload", size: d.size }],
      ownerId,
    };
    setState((s) => ({ ...s, docs: [doc, ...s.docs] }));
    return doc;
  }, [auth.user?.id]);

  const removeDoc = useCallback((id: string) => {
    setState((s) => ({ ...s, docs: s.docs.filter((d) => d.id !== id) }));
  }, []);

  const updateDoc = useCallback((id: string, patch: Partial<Doc>) => {
    setState((s) => ({ ...s, docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  }, []);

  const addCategory = useCallback((name: string, color: string) => {
    setState((s) => ({ ...s, categories: [...s.categories, { id: uid(), name, color }] }));
  }, []);

  const removeCategory = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      docs: s.docs.map((d) => ({ ...d, categoryIds: d.categoryIds.filter((c) => c !== id) })),
    }));
  }, []);

  const addVersion = useCallback((docId: string, note: string) => {
    setState((s) => ({
      ...s,
      docs: s.docs.map((d) =>
        d.id === docId
          ? { ...d, versions: [{ id: uid(), createdAt: Date.now(), note, size: d.size }, ...d.versions] }
          : d,
      ),
    }));
  }, []);

  const restoreVersion = useCallback((docId: string, versionId: string) => {
    setState((s) => ({
      ...s,
      docs: s.docs.map((d) => {
        if (d.id !== docId) return d;
        const idx = d.versions.findIndex((v) => v.id === versionId);
        if (idx < 0) return d;
        const restored = d.versions[idx];
        const newVersions = [
          { id: uid(), createdAt: Date.now(), note: `Restored from ${new Date(restored.createdAt).toLocaleDateString()}`, size: restored.size },
          ...d.versions,
        ];
        return { ...d, versions: newVersions };
      }),
    }));
  }, []);

  const bumpView = useCallback((docId: string) => {
    setState((s) => ({ ...s, docs: s.docs.map((d) => (d.id === docId ? { ...d, views: d.views + 1 } : d)) }));
  }, []);

  const createShareLink: Ctx["createShareLink"] = useCallback((docId, expiresInDays) => {
    const link: ShareLink = {
      id: uid(),
      url: `${typeof window !== "undefined" ? window.location.origin : ""}/s/${uid()}${uid()}`,
      expiresAt: expiresInDays ? Date.now() + expiresInDays * 86400000 : null,
      createdAt: Date.now(),
    };
    setState((s) => ({
      ...s,
      docs: s.docs.map((d) => (d.id === docId ? { ...d, shareLinks: [link, ...d.shareLinks] } : d)),
    }));
    return link;
  }, []);

  const removeShareLink = useCallback((docId: string, linkId: string) => {
    setState((s) => ({
      ...s,
      docs: s.docs.map((d) => (d.id === docId ? { ...d, shareLinks: d.shareLinks.filter((l) => l.id !== linkId) } : d)),
    }));
  }, []);

  const shareWithUsers = useCallback((docId: string, userIds: string[]) => {
    setState((s) => ({
      ...s,
      docs: s.docs.map((d) =>
        d.id === docId ? { ...d, sharedUserIds: Array.from(new Set([...d.sharedUserIds, ...userIds])) } : d,
      ),
    }));
  }, []);

  const unshareUser = useCallback((docId: string, userId: string) => {
    setState((s) => ({
      ...s,
      docs: s.docs.map((d) =>
        d.id === docId ? { ...d, sharedUserIds: d.sharedUserIds.filter((u) => u !== userId) } : d,
      ),
    }));
  }, []);

  const value = useMemo<Ctx>(() => ({
    auth, users: state.users, docs: state.docs, categories: state.categories,
    login, register, logout, addDoc, removeDoc, updateDoc,
    addCategory, removeCategory, addVersion, restoreVersion, bumpView,
    createShareLink, removeShareLink, shareWithUsers, unshareUser,
  }), [auth, state, login, register, logout, addDoc, removeDoc, updateDoc, addCategory, removeCategory, addVersion, restoreVersion, bumpView, createShareLink, removeShareLink, shareWithUsers, unshareUser]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
