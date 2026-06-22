"use client";

export type StatusType = "" | "loading" | "error";

// Generic status line shown at the bottom of a service sidebar.
export default function StatusBar({
  message,
  type = "",
}: {
  message: string;
  type?: StatusType;
}) {
  const color =
    type === "error"
      ? "text-danger"
      : type === "loading"
        ? "text-accent"
        : "text-text-dim";

  return (
    <div
      className={`mt-auto border-t border-border bg-bg px-[22px] py-3 text-[11px] tracking-[0.2px] ${color}`}
    >
      {type === "loading" && (
        <span
          className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle"
          style={{ animation: "pulse-dot 1s infinite" }}
        />
      )}
      {message}
    </div>
  );
}
