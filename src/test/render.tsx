import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import InventoryProvider from "../state/InventoryProvider";

/** Renders inside the router and the inventory, starting at `route` */
export function renderApp(ui: ReactElement, { route = "/" } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <InventoryProvider>{ui}</InventoryProvider>
    </MemoryRouter>
  );
}
