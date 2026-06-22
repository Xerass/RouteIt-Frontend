import Link from "next/link";
import { SERVICES } from "@/lib/services";
import LandingBackground from "@/components/backgrounds/LandingBackground";

//landing page with animated fluid background + one nav card per service.
export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10">
      {/* fluid background layer (sits behind the content) */}
      <div className="absolute inset-0 z-0">
        <LandingBackground />
      </div>

      {/* content: pointer-events pass through to the canvas, re-enabled on cards */}
      <div className="pointer-events-none relative z-10 w-full max-w-[640px]">
        <header className="mb-8 text-center">
          <h1 className="text-[22px] font-bold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            <span className="mr-2 text-text-dim">{"//"}</span>ml platform
          </h1>
          <p className="mt-2 text-[13px] text-text-dim drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            Select a service to get started.
          </p>
        </header>

        <div className="flex flex-col gap-3.5">
          {SERVICES.length === 0 && (
            <div className="py-10 text-center text-[13px] text-text-dim">
              No services registered.
            </div>
          )}

          {SERVICES.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="pointer-events-auto flex items-center gap-[18px] rounded-xl border border-border bg-panel/90 px-[22px] py-5 text-text no-underline backdrop-blur-sm transition-colors hover:border-accent-muted hover:bg-panel-raised hover:shadow-[0_2px_20px_var(--accent-glow)]"
            >
              <span className="w-9 flex-shrink-0 text-center text-2xl text-accent">
                <i className={service.icon} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">
                  {service.name}
                </span>
                <span className="mt-1 block text-xs leading-snug text-text-dim">
                  {service.description}
                </span>
              </span>
              <span className="ml-auto text-[13px] text-text-dim">
                <i className="fa-solid fa-arrow-right" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
