import { useState, useCallback } from "react";

const STORAGE_KEY = "cc-compare-ids";

function getStored(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

// Simple module-level state with listeners for cross-component sync
let compareIds = getStored();
const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

export function useCompare() {
  const [, setTick] = useState(0);

  // Subscribe to changes
  useState(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  });

  const toggle = useCallback((id: string) => {
    if (compareIds.includes(id)) {
      compareIds = compareIds.filter((i) => i !== id);
    } else if (compareIds.length < 3) {
      compareIds = [...compareIds, id];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
    notify();
  }, []);

  const clear = useCallback(() => {
    compareIds = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
    notify();
  }, []);

  const remove = useCallback((id: string) => {
    compareIds = compareIds.filter((i) => i !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compareIds));
    notify();
  }, []);

  return { compareIds, toggle, clear, remove, isComparing: (id: string) => compareIds.includes(id), count: compareIds.length };
}
