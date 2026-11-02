import { useEffect } from "react";
import { useToastStore } from "../stores/toastStore";

export function Toast() {
  const message = useToastStore((s) => s.message);
  const clear = useToastStore((s) => s.clear);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(clear, 2200);
    return () => window.clearTimeout(id);
  }, [message, clear]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-paper shadow-md"
    >
      {message}
    </div>
  );
}
