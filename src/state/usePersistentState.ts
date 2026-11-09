import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

// v2: movements have real dates (`at`) and the sample has six weeks of history. Data saved by v1 is
// dropped once, so everyone starts from the new sample.
const PREFIX = "stocknest:v2:";
try {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("stocknest:v1:"))
    .forEach((k) => localStorage.removeItem(k));
} catch {
  // storage blocked
}

/** True when this browser already has something saved under `key` */
export function hasSavedData(key: string): boolean {
  try {
    return localStorage.getItem(PREFIX + key) !== null;
  } catch {
    return false;
  }
}

/** Like useState, but the value is kept in localStorage so it survives a page reload. `initial` can be a function. */
export default function usePersistentState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(PREFIX + key);
      if (saved !== null) return JSON.parse(saved) as T;
    } catch {
      // storage blocked (private mode) or bad JSON: fall back to the sample data
    }
    return initial instanceof Function ? initial() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // storage full or blocked: keep working in memory
    }
  }, [key, value]);

  return [value, setValue];
}
