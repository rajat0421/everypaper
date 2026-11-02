import { useConnectionStore } from "../stores/connectionStore";

/** Small, non-blocking banner shown only when the backend appears unreachable. Never covers the canvas. */
export function ConnectionBanner() {
  const sessionError = useConnectionStore((s) => s.sessionError);
  if (!sessionError) return null;

  return (
    <div
      role="alert"
      className="pointer-events-none fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-amber-300 bg-amber-50/95 px-3 py-1.5 text-xs text-amber-800 shadow-sm"
    >
      Having trouble reaching the server — your drawings will sync once it's back.
    </div>
  );
}
