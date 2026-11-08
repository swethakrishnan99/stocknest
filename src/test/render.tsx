import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import InventoryProvider from "../state/InventoryProvider";

/** Renders inside the router and the inventory, starting at `route`. Starts in the demo unless `mode` says otherwise. */
export function renderApp(ui: ReactElement, { route = "/", mode = "demo" as "demo" | "own" | null } = {}) {
  if (mode) localStorage.setItem("stocknest:v2:mode", JSON.stringify(mode));
  return render(
    <MemoryRouter initialEntries={[route]}>
      <InventoryProvider>{ui}</InventoryProvider>
    </MemoryRouter>
  );
}
