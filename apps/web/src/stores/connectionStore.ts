import { create } from "zustand";
import type { SocketStatus } from "../services/socket";

interface ConnectionState {
  socketStatus: SocketStatus;
  presenceCount: number | null;
  sessionError: boolean;
  setSocketStatus: (status: SocketStatus) => void;
  setPresenceCount: (count: number | null) => void;
  setSessionError: (hasError: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  socketStatus: "connecting",
  presenceCount: null,
  sessionError: false,
  setSocketStatus: (socketStatus) => set({ socketStatus }),
  setPresenceCount: (presenceCount) => set({ presenceCount }),
  setSessionError: (sessionError) => set({ sessionError })
}));
