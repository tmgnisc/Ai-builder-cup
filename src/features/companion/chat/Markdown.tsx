import { Fragment } from "react";

/** Minimal, safe renderer for Pip's text: **bold**, line breaks and "•" bullets. No HTML injection. */
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.trim() === "") return i < lines.length - 1 ? <span key={i} className="block h-2" /> : null;
        const bullet = /^\s*[•-]\s+/.test(line);
        const content = line.replace(/^\s*[•-]\s+/, "");
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="font-semibold text-text">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <Fragment key={j}>{part}</Fragment>
          ),
        );
        return (
          <span key={i} className={bullet ? "block pl-4 -indent-3" : "block"}>
            {bullet && <span aria-hidden>• </span>}
            {parts}
          </span>
        );
      })}
    </>
  );
}
