"use client";

export interface ModeTab {
  mode: string;
  label: string;
  icon: string; // Font Awesome class
}

// Generic tab strip (e.g. Upload / Stream). Reusable across services.
export default function ModeTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: ModeTab[];
  active: string;
  onChange: (mode: string) => void;
}) {
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.mode === active;
        return (
          <button
            key={tab.mode}
            onClick={() => onChange(tab.mode)}
            className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-panel-raised text-accent shadow-[inset_0_-2px_0_var(--color-accent)]"
                : "text-text-dim hover:bg-panel-raised hover:text-text-mid"
            }`}
          >
            <i className={tab.icon} /> {tab.label}
          </button>
        );
      })}
    </div>
  );
}
