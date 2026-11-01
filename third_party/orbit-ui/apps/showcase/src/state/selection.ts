import { useSyncExternalStore } from "react";

/* Selection lives in a tiny external store so that changing the selected issue
   re-renders only the two affected cards instead of the whole board. */
let selectedKey: string | null = null;
const listeners = new Set<() => void>();
export const boardSelection = {
  set(key: string | null) {
    if (key === selectedKey) return;
    selectedKey = key;
    listeners.forEach((l) => l());
  },
};
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
export const useIsSelected = (key: string) =>
  useSyncExternalStore(subscribe, () => selectedKey === key);
