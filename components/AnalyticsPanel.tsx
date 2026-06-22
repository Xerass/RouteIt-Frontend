"use client";

import type { ReactNode } from "react";

export type AnalyticsRow = { label: string; value: ReactNode } | "divider";

// Generic key/value analytics panel. The service supplies the rows; this
// component only handles layout, so any service can reuse it.
export default function AnalyticsPanel({
  title,
  rows,
  visible,
}: {
  title: string;
  rows: AnalyticsRow[];
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto border-t border-border bg-panel-raised px-[22px] py-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
        {title}
      </div>
      {rows.map((row, i) =>
        row === "divider" ? (
          <div key={i} className="my-2 h-px bg-border" />
        ) : (
          <div
            key={i}
            className="flex items-center justify-between py-[5px] text-[12.5px]"
          >
            <span className="font-medium text-text-dim">{row.label}</span>
            <span className="text-[13px] font-semibold text-accent">
              {row.value}
            </span>
          </div>
        ),
      )}
    </div>
  );
}
