import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UserRole = "admin" | "user";
export type User = { id: string; email: string; name: string; avatar?: string; role: UserRole };
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
  dataUrl?: string;
  categoryIds: string[];
  sharedUserIds: string[];
  shareLinks: ShareLink[];
  versions: Version[];
  ownerId: string;
  starred?: boolean;
  trashedAt?: number | null;
};

export type ActivityKind =
  | "upload" | "delete" | "open" | "view"
  | "share-user" | "unshare-user"
  | "share-link-create" | "share-link-revoke"
  | "version-save" | "version-restore"
  | "category-change" | "login" | "register"
  | "star" | "unstar" | "trash" | "restore" | "purge" | "profile-update";

export type Activity = {
  id: string;
  kind: ActivityKind;
  at: number;
  userId: string;
  docId?: string;
  docName?: string;
  meta?: string;
};

type Auth = { user: User | null; token: string | null };

type Ctx = {
  auth: Auth;
  users: User[];
  docs: Doc[];
  categories: Category[];
  activities: Activity[];
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  addDoc: (d: Omit<Doc, "id" | "uploadedAt" | "views" | "categoryIds" | "sharedUserIds" | "shareLinks" | "versions" | "ownerId">) => Doc;
  removeDoc: (id: string) => void;
  trashDoc: (id: string) => void;
  trashDocs: (ids: string[]) => void;
  restoreDoc: (id: string) => void;
  purgeDoc: (id: string) => void;
  emptyTrash: () => void;
  toggleStar: (id: string) => void;
  starDocs: (ids: string[], starred: boolean) => void;
  updateDoc: (id: string, patch: Partial<Doc>) => void;
  toggleDocCategory: (docId: string, catId: string) => void;
  addCategory: (name: string, color: string) => void;
  removeCategory: (id: string) => void;
  addVersion: (docId: string, note: string) => void;
  restoreVersion: (docId: string, versionId: string) => void;
  bumpView: (docId: string) => void;
  recordOpen: (docId: string) => void;
  createShareLink: (docId: string, expiresInDays: number | null) => ShareLink;
  removeShareLink: (docId: string, linkId: string) => void;
  shareWithUsers: (docId: string, userIds: string[]) => void;
  unshareUser: (docId: string, userId: string) => void;
  updateProfile: (patch: Partial<Pick<User, "name" | "email" | "avatar">>) => void;
};

const StoreContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "docvault.state.v2";
const AUTH_KEY = "docvault.auth.v1";

const seedUsers: User[] = [
  { id: "u1", email: "alex@docvault.io", name: "Alex Rivera", role: "user" },
  { id: "u2", email: "maya@docvault.io", name: "Maya Chen", role: "user" },
  { id: "u3", email: "jordan@docvault.io", name: "Jordan Lee", role: "user" },
  { id: "u4", email: "sam@docvault.io", name: "Sam Patel", role: "user" },
  { id: "u5", email: "kai@docvault.io", name: "Kai Tanaka", role: "user" },
  { id: "admin", email: "admin@docvault.io", name: "System Admin", role: "admin" },
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

function seedActivities(ownerId: string, docs: Doc[]): Activity[] {
  return docs.map((d) => ({
    id: uid(), kind: "upload" as ActivityKind, at: d.uploadedAt, userId: ownerId, docId: d.id, docName: d.name,
  }));
}

type Persisted = { users: User[]; docs: Doc[]; categories: Category[]; activities: Activity[] };

function loadState(): Persisted {
  if (typeof window === "undefined") return { users: seedUsers, docs: [], categories: seedCategories, activities: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { activities: [], ...parsed };
    }
  } catch { }
  return { users: seedUsers, docs: [], categories: seedCategories, activities: [] };
}

function loadAuth(): Auth {
  if (typeof window === "undefined") return { user: null, token: null };
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage quota — drop dataUrls and retry
      try {
        const trimmed = { ...state, docs: state.docs.map((d) => ({ ...d, dataUrl: undefined })) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch { }
    }
  }, [state, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }, [auth, hydrated]);

  const logActivity = useCallback((a: Omit<Activity, "id" | "at" | "userId">) => {
    const userId = auth.user?.id;
    if (!userId) return;
    setState((s) => ({
      ...s,
      activities: [{ id: uid(), at: Date.now(), userId, ...a }, ...s.activities].slice(0, 500),
    }));
  }, [auth.user?.id]);

  const login = useCallback(async (email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 400));
    let user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = { id: uid(), email, name: email.split("@")[0], role: "user" };
      setState((s) => ({ ...s, users: [...s.users, user!] }));
    }
    const u = user;
    setAuth({ user: u, token: uid() });
    setState((s) => {
      if (s.docs.some((d) => d.ownerId === u.id)) {
        return { ...s, activities: [{ id: uid(), at: Date.now(), userId: u.id, kind: "login" }, ...s.activities] };
      }
      const newDocs = seedDocs(u.id);
      return {
        ...s,
        docs: [...s.docs, ...newDocs],
        activities: [
          { id: uid(), at: Date.now(), userId: u.id, kind: "login" },
          ...seedActivities(u.id, newDocs),
          ...s.activities,
        ],
      };
    });
  }, [state.users]);

  const register = useCallback(async (name: string, email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 400));
    const existing = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error("An account with that email already exists.");
    const user: User = { id: uid(), email, name, role: "user" };
    const newDocs = seedDocs(user.id);
    setState((s) => ({
      ...s,
      users: [...s.users, user],
      docs: [...s.docs, ...newDocs],
      activities: [
        { id: uid(), at: Date.now(), userId: user.id, kind: "register" },
        ...seedActivities(user.id, newDocs),
        ...s.activities,
      ],
    }));
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
    setState((s) => ({
      ...s,
      docs: [doc, ...s.docs],
      activities: [{ id: uid(), at: Date.now(), userId: ownerId, kind: "upload", docId: doc.id, docName: doc.name }, ...s.activities],
    }));
    return doc;
  }, [auth.user?.id]);

  const removeDoc = useCallback((id: string) => {
    setState((s) => {
      const d = s.docs.find((x) => x.id === id);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.filter((x) => x.id !== id),
        activities: d ? [{ id: uid(), at: Date.now(), userId, kind: "delete", docId: id, docName: d.name }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  const trashDoc = useCallback((id: string) => {
    setState((s) => {
      const d = s.docs.find((x) => x.id === id);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((x) => (x.id === id ? { ...x, trashedAt: Date.now() } : x)),
        activities: d ? [{ id: uid(), at: Date.now(), userId, kind: "trash", docId: id, docName: d.name }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  const trashDocs = useCallback((ids: string[]) => {
    setState((s) => {
      const userId = auth.user?.id ?? "anon";
      const now = Date.now();
      const acts: Activity[] = s.docs
        .filter((d) => ids.includes(d.id))
        .map((d) => ({ id: uid(), at: now, userId, kind: "trash" as ActivityKind, docId: d.id, docName: d.name }));
      return {
        ...s,
        docs: s.docs.map((x) => (ids.includes(x.id) ? { ...x, trashedAt: now } : x)),
        activities: [...acts, ...s.activities],
      };
    });
  }, [auth.user?.id]);

  const restoreDoc = useCallback((id: string) => {
    setState((s) => {
      const d = s.docs.find((x) => x.id === id);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((x) => (x.id === id ? { ...x, trashedAt: null } : x)),
        activities: d ? [{ id: uid(), at: Date.now(), userId, kind: "restore", docId: id, docName: d.name }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  const purgeDoc = useCallback((id: string) => {
    setState((s) => {
      const d = s.docs.find((x) => x.id === id);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.filter((x) => x.id !== id),
        activities: d ? [{ id: uid(), at: Date.now(), userId, kind: "purge", docId: id, docName: d.name }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  const emptyTrash = useCallback(() => {
    setState((s) => {
      const userId = auth.user?.id ?? "anon";
      const now = Date.now();
      const trashed = s.docs.filter((d) => d.ownerId === userId && d.trashedAt);
      const acts: Activity[] = trashed.map((d) => ({ id: uid(), at: now, userId, kind: "purge" as ActivityKind, docId: d.id, docName: d.name }));
      return {
        ...s,
        docs: s.docs.filter((d) => !(d.ownerId === userId && d.trashedAt)),
        activities: [...acts, ...s.activities],
      };
    });
  }, [auth.user?.id]);

  const toggleStar = useCallback((id: string) => {
    setState((s) => {
      const d = s.docs.find((x) => x.id === id);
      if (!d) return s;
      const userId = auth.user?.id ?? "anon";
      const next = !d.starred;
      return {
        ...s,
        docs: s.docs.map((x) => (x.id === id ? { ...x, starred: next } : x)),
        activities: [{ id: uid(), at: Date.now(), userId, kind: next ? "star" : "unstar", docId: id, docName: d.name }, ...s.activities],
      };
    });
  }, [auth.user?.id]);

  const starDocs = useCallback((ids: string[], starred: boolean) => {
    setState((s) => ({ ...s, docs: s.docs.map((x) => (ids.includes(x.id) ? { ...x, starred } : x)) }));
  }, []);

  const updateDoc = useCallback((id: string, patch: Partial<Doc>) => {
    setState((s) => ({ ...s, docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch } : d)) }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Pick<User, "name" | "email" | "avatar">>) => {
    if (!auth.user) return;
    const userId = auth.user.id;
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
      activities: [{ id: uid(), at: Date.now(), userId, kind: "profile-update" }, ...s.activities],
    }));
    setAuth((a) => (a.user ? { ...a, user: { ...a.user, ...patch } } : a));
  }, [auth.user]);


  const toggleDocCategory = useCallback((docId: string, catId: string) => {
    setState((s) => {
      const doc = s.docs.find((d) => d.id === docId);
      if (!doc) return s;
      const has = doc.categoryIds.includes(catId);
      const cat = s.categories.find((c) => c.id === catId);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((d) => d.id === docId
          ? { ...d, categoryIds: has ? d.categoryIds.filter((c) => c !== catId) : [...d.categoryIds, catId] }
          : d),
        activities: [{
          id: uid(), at: Date.now(), userId, kind: "category-change",
          docId, docName: doc.name, meta: `${has ? "Removed" : "Added"} category “${cat?.name ?? ""}”`,
        }, ...s.activities],
      };
    });
  }, [auth.user?.id]);

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
    setState((s) => {
      const doc = s.docs.find((d) => d.id === docId);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((d) =>
          d.id === docId
            ? { ...d, versions: [{ id: uid(), createdAt: Date.now(), note, size: d.size }, ...d.versions] }
            : d,
        ),
        activities: doc ? [{ id: uid(), at: Date.now(), userId, kind: "version-save", docId, docName: doc.name, meta: note }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  const restoreVersion = useCallback((docId: string, versionId: string) => {
    setState((s) => {
      const doc = s.docs.find((d) => d.id === docId);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((d) => {
          if (d.id !== docId) return d;
          const idx = d.versions.findIndex((v) => v.id === versionId);
          if (idx < 0) return d;
          const restored = d.versions[idx];
          return {
            ...d,
            versions: [
              { id: uid(), createdAt: Date.now(), note: `Restored from ${new Date(restored.createdAt).toLocaleDateString()}`, size: restored.size },
              ...d.versions,
            ],
          };
        }),
        activities: doc ? [{ id: uid(), at: Date.now(), userId, kind: "version-restore", docId, docName: doc.name }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  const bumpView = useCallback((docId: string) => {
    setState((s) => ({ ...s, docs: s.docs.map((d) => (d.id === docId ? { ...d, views: d.views + 1 } : d)) }));
  }, []);

  const recordOpen = useCallback((docId: string) => {
    setState((s) => {
      const d = s.docs.find((x) => x.id === docId);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((x) => (x.id === docId ? { ...x, views: x.views + 1 } : x)),
        activities: d ? [{ id: uid(), at: Date.now(), userId, kind: "open", docId, docName: d.name }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  const createShareLink: Ctx["createShareLink"] = useCallback((docId, expiresInDays) => {
    const link: ShareLink = {
      id: uid(),
      url: `${typeof window !== "undefined" ? window.location.origin : ""}/s/${uid()}${uid()}`,
      expiresAt: expiresInDays ? Date.now() + expiresInDays * 86400000 : null,
      createdAt: Date.now(),
    };
    setState((s) => {
      const doc = s.docs.find((d) => d.id === docId);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((d) => (d.id === docId ? { ...d, shareLinks: [link, ...d.shareLinks] } : d)),
        activities: doc ? [{ id: uid(), at: Date.now(), userId, kind: "share-link-create", docId, docName: doc.name, meta: expiresInDays ? `Expires in ${expiresInDays}d` : "No expiry" }, ...s.activities] : s.activities,
      };
    });
    return link;
  }, [auth.user?.id]);

  const removeShareLink = useCallback((docId: string, linkId: string) => {
    setState((s) => {
      const doc = s.docs.find((d) => d.id === docId);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((d) => (d.id === docId ? { ...d, shareLinks: d.shareLinks.filter((l) => l.id !== linkId) } : d)),
        activities: doc ? [{ id: uid(), at: Date.now(), userId, kind: "share-link-revoke", docId, docName: doc.name }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  const shareWithUsers = useCallback((docId: string, userIds: string[]) => {
    setState((s) => {
      const doc = s.docs.find((d) => d.id === docId);
      const userId = auth.user?.id ?? "anon";
      const names = s.users.filter((u) => userIds.includes(u.id)).map((u) => u.name).join(", ");
      return {
        ...s,
        docs: s.docs.map((d) =>
          d.id === docId ? { ...d, sharedUserIds: Array.from(new Set([...d.sharedUserIds, ...userIds])) } : d,
        ),
        activities: doc ? [{ id: uid(), at: Date.now(), userId, kind: "share-user", docId, docName: doc.name, meta: `Shared with ${names}` }, ...s.activities] : s.activities,
      };
    });
  }, []);

  const unshareUser = useCallback((docId: string, targetUserId: string) => {
    setState((s) => {
      const doc = s.docs.find((d) => d.id === docId);
      const target = s.users.find((u) => u.id === targetUserId);
      const userId = auth.user?.id ?? "anon";
      return {
        ...s,
        docs: s.docs.map((d) =>
          d.id === docId ? { ...d, sharedUserIds: d.sharedUserIds.filter((u) => u !== targetUserId) } : d,
        ),
        activities: doc ? [{ id: uid(), at: Date.now(), userId, kind: "unshare-user", docId, docName: doc.name, meta: `Removed ${target?.name ?? ""}` }, ...s.activities] : s.activities,
      };
    });
  }, [auth.user?.id]);

  void logActivity;

  const value = useMemo<Ctx>(() => ({
    auth, users: state.users, docs: state.docs, categories: state.categories, activities: state.activities,
    login, register, logout, addDoc, removeDoc, updateDoc, toggleDocCategory,
    addCategory, removeCategory, addVersion, restoreVersion, bumpView, recordOpen,
    createShareLink, removeShareLink, shareWithUsers, unshareUser,
    trashDoc, trashDocs, restoreDoc, purgeDoc, emptyTrash, toggleStar, starDocs, updateProfile,
  }), [auth, state, login, register, logout, addDoc, removeDoc, updateDoc, toggleDocCategory, addCategory, removeCategory, addVersion, restoreVersion, bumpView, recordOpen, createShareLink, removeShareLink, shareWithUsers, unshareUser, trashDoc, trashDocs, restoreDoc, purgeDoc, emptyTrash, toggleStar, starDocs, updateProfile]);

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
