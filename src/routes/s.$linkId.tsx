import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore, formatBytes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ImageIcon, Download, ExternalLink, Lock, Clock, ShieldAlert } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { DocxPreview, isDocx } from "@/components/docx-preview";

export const Route = createFileRoute("/s/$linkId")({
  component: SharePage,
});

function SharePage() {
  const { linkId } = useParams({ from: "/s/$linkId" });
  const { docs, users } = useStore();

  const target = useMemo(() => {
    for (const d of docs) {
      const link = d.shareLinks.find((l) => l.token === linkId);
      if (link) return { doc: d, link, owner: users.find((u) => u.id === d.ownerId) };
    }
    return null;
  }, [docs, users, linkId]);

  if (!target) return <ShareEmpty kind="missing" />;

  const { doc, link, owner } = target;
  const expired = link.expiresAt !== null && link.expiresAt < Date.now();
  if (expired) return <ShareEmpty kind="expired" />;
  if (doc.trashedAt) return <ShareEmpty kind="missing" />;

  return <ShareView doc={doc} link={link} ownerName={owner?.name ?? "Someone"} />;
}

function ShareEmpty({ kind }: { kind: "missing" | "expired" }) {
  const Icon = kind === "expired" ? Clock : ShieldAlert;
  const title = kind === "expired" ? "This link has expired" : "Link not found";
  const desc = kind === "expired"
    ? "The owner set this share link to expire. Ask them for a fresh one."
    : "This share link is invalid, has been revoked, or the file no longer exists.";
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
        <Button asChild className="mt-6 bg-gradient-primary hover:opacity-90">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}

function ShareView({
  doc, link, ownerName,
}: {
  doc: ReturnType<typeof useStore>["docs"][number];
  link: { expiresAt: number | null; createdAt: number };
  ownerName: string;
}) {
  const isImg = doc.type.startsWith("image/");
  const isPdf = doc.type === "application/pdf";
  const isText = doc.type.startsWith("text/") || doc.type === "application/json";
  const isVideo = doc.type.startsWith("video/");
  const isAudio = doc.type.startsWith("audio/");
  const isDocxFile = isDocx(doc.type, doc.name);
  const canPreview = !!doc.dataUrl && (isImg || isPdf || isText || isVideo || isAudio || isDocxFile);
  const canOpenInTab = !!doc.dataUrl && (isImg || isPdf || isText || isVideo || isAudio);

  const [textBody, setTextBody] = useState<string>("");
  useEffect(() => {
    if (!isText || !doc.dataUrl) return;
    let cancelled = false;
    fetch(doc.dataUrl)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setTextBody(t.slice(0, 20000)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isText, doc.dataUrl]);

  const toBlobUrl = async (dataUrl: string) => {
    const blob = await fetch(dataUrl).then((r) => r.blob());
    return URL.createObjectURL(blob);
  };

  const handleDownload = async () => {
    if (!doc.dataUrl) return toast.error("This file isn't available for download.");
    try {
      const url = await toBlobUrl(doc.dataUrl);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Couldn't download the file");
    }
  };

  const handleOpen = async () => {
    if (!doc.dataUrl) return;
    const w = window.open("about:blank", "_blank");
    if (!w) {
      toast.error("Pop-up blocked — allow pop-ups for this site");
      return;
    }
    try {
      const url = await toBlobUrl(doc.dataUrl);
      w.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      w.close();
      toast.error("Couldn't open the file");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">DocVault</span>
          </Link>
          <Badge variant="outline" className="gap-1.5">
            <Lock className="h-3 w-3" /> Shared link
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isImg ? <ImageIcon className="h-5 w-5 text-primary shrink-0" /> : <FileText className="h-5 w-5 text-primary shrink-0" />}
                <h1 className="truncate text-lg font-semibold">{doc.name}</h1>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatBytes(doc.size)} · shared by {ownerName} · {format(doc.uploadedAt, "PPP")}
                {link.expiresAt && (
                  <> · expires {formatDistanceToNow(link.expiresAt, { addSuffix: true })}</>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {canOpenInTab && (
                <Button variant="outline" size="sm" onClick={handleOpen}>
                  <ExternalLink className="mr-1 h-3 w-3" /> Open
                </Button>
              )}
              <Button size="sm" onClick={handleDownload} disabled={!doc.dataUrl} className="bg-gradient-primary hover:opacity-90">
                <Download className="mr-1 h-3 w-3" /> Download
              </Button>
            </div>
          </div>

          <div className="p-6">
            {canPreview ? (
              <div className="overflow-hidden rounded-xl border border-border bg-muted">
                {isImg && <img src={doc.dataUrl} alt={doc.name} className="max-h-[70vh] w-full object-contain bg-background" />}
                {isPdf && <iframe src={doc.dataUrl} title={doc.name} className="h-[70vh] w-full bg-background" />}
                {isText && (
                  <pre className="max-h-[70vh] overflow-auto bg-background p-4 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                    {textBody || "Loading…"}
                  </pre>
                )}
                {isVideo && <video src={doc.dataUrl} controls className="max-h-[70vh] w-full bg-background" />}
                {isAudio && <audio src={doc.dataUrl} controls className="w-full p-4" />}
                {isDocxFile && <DocxPreview dataUrl={doc.dataUrl!} />}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-10 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-medium">No inline preview</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {doc.dataUrl
                    ? "This file type can't be rendered in the browser. Use Download or Open."
                    : "This file isn't stored locally on this device, so it can't be previewed or downloaded here."}
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Anyone with this link can view the file until it expires.
        </p>
      </main>
    </div>
  );
}
