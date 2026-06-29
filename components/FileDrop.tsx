"use client";

import { useRef, useState } from "react";

// Generic drag-and-drop / click-to-browse file picker. No service-specific
// logic — the caller passes accepted extensions and handles the chosen file.
export default function FileDrop({
  accept,
  hint,
  fileName,
  onFile,
  label = "Drop a file or click to browse",
  icon = "fa-cloud-arrow-up",
}: {
  accept: string;
  hint: string;
  fileName: string;
  onFile: (file: File) => void;
  label?: string;
  icon?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="px-[22px] py-[18px]">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        className={`group relative flex cursor-pointer flex-col items-center gap-2 rounded-[10px] border-2 border-dashed px-4 py-7 text-center transition-colors ${
          dragOver
            ? "border-accent-muted bg-[var(--accent-glow)]"
            : "border-border hover:border-accent-muted hover:bg-[var(--accent-glow)]"
        }`}
      >
        <i
          className={`fa-solid ${icon} text-2xl transition-colors ${
            dragOver ? "text-accent" : "text-text-dim group-hover:text-accent"
          }`}
        />
        <span className="text-[12.5px] text-text-dim">{label}</span>
        <span className="text-[10px] text-text-dim opacity-60">{hint}</span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          // pointer-events-none so a click passes through to the wrapper's
          // onClick (which opens the dialog once); without this the click also
          // hits the input directly and the file dialog opens twice.
          className="pointer-events-none absolute inset-0 opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>
      <div className="mt-2.5 min-h-[18px] truncate text-xs text-accent">
        {fileName}
      </div>
    </div>
  );
}
