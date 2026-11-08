import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { renderApp } from "./test/render";

describe("App", () => {
  it("reorders from the dashboard, then receives the delivery", async () => {
    renderApp(<App />);
    expect(screen.getByText("Friday, Nov 6")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reorder Unsalted butter, 454 g" }));
    const dialog = screen.getByRole("dialog", { name: "Reorder Unsalted butter, 454 g" });
    await userEvent.click(within(dialog).getByRole("button", { name: /Place order/ }));
    const placed = screen.getByRole("dialog", { name: "PO #1046 placed" });
    expect(placed).toHaveTextContent("Unsalted butter, 454 g · 20 blocks");
    expect(within(placed).getByRole("link", { name: "Email supplier" })).toHaveAttribute("href", expect.stringContaining("mailto:orders%40dairyland.example"));
    await userEvent.click(within(placed).getByRole("button", { name: "Done" }));

    await userEvent.click(screen.getByRole("button", { name: "Receive PO #1046 for Unsalted butter, 454 g" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark as received" }));
    expect(screen.getByRole("status")).toHaveTextContent("On hand is now 24.");
    expect(screen.queryByRole("button", { name: /Reorder Unsalted butter/ })).not.toBeInTheDocument();
  });

  it("lists ordered items that haven't arrived, and receives them from Products", async () => {
    renderApp(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Reorder Unsalted butter, 454 g" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Place order/ }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await userEvent.click(screen.getByRole("button", { name: "Reorder Vanilla extract, 500 ml" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Place order/ }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    await userEvent.click(screen.getByRole("button", { name: /On order/ }));
    expect(screen.getByText(/Showing 1–2 of 2 \(51/)).toBeInTheDocument();
    expect(screen.getByText(/On order · PO #1046 · 20 blocks due/)).toBeInTheDocument();
    expect(screen.getByText(/On order · PO #1047 · 6 bottles due/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Receive PO #1046 for Unsalted butter, 454 g" }));
    await userEvent.click(screen.getByRole("button", { name: "Mark as received" }));
    expect(screen.getByText(/Showing 1–1 of 1 \(51/)).toBeInTheDocument();
    expect(screen.queryByText(/On order · PO #1046/)).not.toBeInTheDocument();
  });

  it("deletes a product and brings it back with Undo", async () => {
    renderApp(<App />, { route: "/products/ING-0044" });
    await userEvent.click(screen.getByRole("button", { name: "Edit product" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete product" }));
    await userEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Delete product" }));

    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Deleted Vanilla extract, 500 ml.");
    expect(screen.getByText("Showing 1–10 of 50")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("status")).toHaveTextContent("Vanilla extract, 500 ml is back.");
    expect(screen.getByText("Showing 1–10 of 51")).toBeInTheDocument();
  });

  it("works out reports for the chosen period", async () => {
    renderApp(<App />, { route: "/reports" });
    expect(screen.getByText("Last 4 weeks · Oct 10 – Nov 6 · values at cost")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole("combobox"), "Last 7 days");
    expect(screen.getByText("Last 7 days · Oct 31 – Nov 6 · values at cost")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stock in vs out per day" })).toBeInTheDocument();
  });
});
