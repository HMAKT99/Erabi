"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <button
      onClick={copy}
      className="rounded border border-terminal-border px-2 py-0.5 text-[11px] text-terminal-dim hover:border-terminal-green hover:text-terminal-green"
    >
      {copied ? "✓ copied" : label}
    </button>
  );
}
