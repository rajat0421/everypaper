import { useQuery } from "@tanstack/react-query";
import type { SessionDto } from "@everypaper/shared";
import { api } from "../services/api";

/**
 * Establishes anonymous session identity. Tries GET /sessions/me first (the
 * server auto-creates one if the cookie is missing); falls back to
 * POST /sessions. Retries a couple of times so a backend that's briefly
 * unavailable on cold start doesn't permanently fail the app shell.
 */
export function useSession() {
  return useQuery<SessionDto>({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        return await api.getMe();
      } catch {
        return await api.createSession();
      }
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    staleTime: Infinity,
    refetchOnWindowFocus: false
  });
}
