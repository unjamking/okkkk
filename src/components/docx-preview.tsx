import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type State = { kind: "loading" } | { kind: "ok"; html: string } | { kind: "error"; msg: string };

export function isDocx(type: string, name: string) {
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return true;
  return name.toLowerCase().endsWith(".docx");
}

const PAGE_CONTENT_CLASS =
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 " +
  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 " +
  "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 " +
  "[&_p]:my-2 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 " +
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 " +
  "[&_strong]:font-semibold [&_em]:italic " +
  "[&_a]:text-primary [&_a]:underline " +
  "[&_table]:border-collapse [&_table]:my-3 [&_table]:w-full " +
  "[&_td]:border [&_td]:border-neutral-300 [&_td]:p-2 [&_td]:align-top " +
  "[&_th]:border [&_th]:border-neutral-300 [&_th]:p-2 [&_th]:bg-neutral-100 [&_th]:text-left " +
  "[&_img]:max-w-full";

export function DocxPreview({ dataUrl }: { dataUrl: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    setExpanded(false);
    (async () => {
      try {
        const arrayBuffer = await fetch(dataUrl).then((r) => r.arrayBuffer());
        const mod = await import("mammoth");
        const mammoth: { convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> } =
          (mod as unknown as { default?: typeof mod }).default ?? mod;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setState({ kind: "ok", html: result.value || "<p><em>This document appears to be empty.</em></p>" });
      } catch {
        if (!cancelled) setState({ kind: "error", msg: "Couldn't render this document. Download it to view in Word." });
      }
    })();
    return () => { cancelled = true; };
  }, [dataUrl]);

  if (state.kind === "loading") {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Rendering first page…
      </div>
    );
  }
  if (state.kind === "error") {
    return <div className="p-6 text-sm text-muted-foreground">{state.msg}</div>;
  }

  return (
    <div className="flex flex-col items-center gap-3 bg-muted/40 p-6">
      <div className="w-full max-w-[780px]">
        <div className={`relative ${expanded ? "" : "max-h-[920px] overflow-hidden"}`}>
          <div
            className={`mx-auto rounded-md bg-white text-neutral-900 shadow-lg ring-1 ring-neutral-200
                        px-12 py-14 ${PAGE_CONTENT_CLASS}`}
            dangerouslySetInnerHTML={{ __html: state.html }}
          />
          {!expanded && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-muted/90 to-transparent" />
          )}
        </div>
        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show first page only" : "Show full document"}
          </Button>
        </div>
      </div>
    </div>
  );
}
