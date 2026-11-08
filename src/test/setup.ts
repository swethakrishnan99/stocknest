import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Every test runs on the same day and time, so dates and the generated sample are predictable:
// Friday Nov 6 2026, 10:00 local time. Only Date is faked; timers stay real for user-event.
export const TEST_NOW = new Date(2026, 10, 6, 10, 0);

// jsdom doesn't scroll; the app scrolls to the top on each new page
window.scrollTo = () => {};

beforeEach(() => {
  vi.useFakeTimers({ now: TEST_NOW, toFake: ["Date"] });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
