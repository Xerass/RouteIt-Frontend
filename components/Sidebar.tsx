"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

// Generic collapsible sidebar shell — reusable by any service page.
export default function Sidebar({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`relative z-[1000] flex w-[360px] min-w-[360px] flex-col border-r border-border bg-panel transition-[margin] duration-300 ${
        collapsed ? "-ml-[360px]" : ""
      }`}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label="Toggle sidebar"
        className="absolute -right-9 top-4 z-[1001] flex h-8 w-8 items-center justify-center rounded-r-lg border border-l-0 border-border bg-panel text-xs text-text-mid transition-colors hover:bg-panel-raised hover:text-accent"
      >
        <i
          className={`fa-solid fa-chevron-left transition-transform duration-300 ${
            collapsed ? "rotate-180" : ""
          }`}
        />
      </button>

      <div className="border-b border-border bg-gradient-to-b from-panel-raised to-panel px-[22px] pb-5 pt-6">
        <h1 className="text-[15px] font-semibold tracking-tight text-text">
          <span className="mr-1.5 text-text-dim">{"//"}</span>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[12.5px] leading-snug text-text-dim">
            {subtitle}
          </p>
        )}
        <p className="mt-1.5 text-[12.5px]">
          <Link href="/" className="text-accent hover:underline">
            &larr; back to platform
          </Link>
        </p>
      </div>

      {children}
    </div>
  );
}
