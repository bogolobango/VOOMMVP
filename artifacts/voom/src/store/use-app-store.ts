import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  isHostMode: boolean;
  toggleHostMode: () => void;
  setHostMode: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isHostMode: false,
      toggleHostMode: () => set((state) => ({ isHostMode: !state.isHostMode })),
      setHostMode: (val) => set({ isHostMode: val }),
    }),
    {
      name: "voom-app-settings",
    }
  )
);
