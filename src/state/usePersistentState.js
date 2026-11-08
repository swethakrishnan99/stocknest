import { useEffect, useState } from "react";

const PREFIX = "stocknest:v1:";

/** Like useState, but the value is kept in localStorage so it survives a page reload. */
export default function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(PREFIX + key);
      return saved === null ? initial : JSON.parse(saved);
    } catch {
      return initial; // storage blocked (private mode) or bad JSON: fall back to the sample data
    }
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
