import { useConnectionStore } from "../stores/connectionStore";

export function StatusPill() {
  const socketStatus = useConnectionStore((s) => s.socketStatus);
  const presenceCount = useConnectionStore((s) => s.presenceCount);
  const live = socketStatus === "connected";

  return (
    <div
      className="pointer-events-none flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 text-xs text-ink/70 shadow-sm backdrop-blur"
      aria-live="polite"
    >
      <span
        className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"} ${
          live ? "animate-pulse" : ""
        }`}
      />
      <span>{live ? "Live" : "Connecting…"}</span>
      {presenceCount !== null && (
        <span className="ml-0.5 text-ink/50">
          · {presenceCount} {presenceCount === 1 ? "visitor" : "visitors"}
        </span>
      )}
    </div>
  );
}
