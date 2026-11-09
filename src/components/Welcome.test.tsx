import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { renderApp } from "../test/render";

describe("first run", () => {
  it("offers the demo or your own business, and sets up your own", async () => {
    renderApp(<App />, { mode: null });
    expect(screen.getByRole("heading", { name: "Know what's on your shelves." })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Set up my business/ }));
    await userEvent.click(screen.getByRole("button", { name: "Start using StockNest" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your business name.");

    await userEvent.type(screen.getByLabelText("Business name"), "Rosie's Gifts");
    await userEvent.click(screen.getByRole("radio", { name: /Shop or boutique/ }));
    await userEvent.click(screen.getByRole("button", { name: "Remove Back room" }));
    await userEvent.type(screen.getByLabelText("Another location"), "Garage{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Start using StockNest" }));

    expect(screen.getByRole("heading", { name: "Welcome to Rosie's Gifts" })).toBeInTheDocument();
    expect(screen.queryByText(/demo bakery/)).not.toBeInTheDocument();

    // The first product uses the shop's own categories and locations
    await userEvent.click(screen.getByRole("button", { name: "Add a product" }));
    const dialog = screen.getByRole("dialog", { name: "Add product" });
    expect(within(dialog).getAllByRole("option").map((o) => o.textContent)).toEqual(
      expect.arrayContaining(["Products for sale", "Packaging", "Shop supplies", "Shop floor", "Garage"])
    );
    await userEvent.type(within(dialog).getByPlaceholderText("e.g. Rye flour, 5 kg"), "Scented candle");
    await userEvent.type(dialog.querySelector<HTMLInputElement>('[name="qty"]')!, "12");
    await userEvent.type(dialog.querySelector<HTMLInputElement>('[name="unit"]')!, "pcs");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add product" }));
    expect(screen.getByText(/Added Scented candle \(PRO-0001\)/)).toBeInTheDocument();
  });

  it("opens the demo with a banner", async () => {
    renderApp(<App />, { mode: null });
    await userEvent.click(screen.getByRole("button", { name: /Try the demo bakery/ }));
    expect(screen.getByText("You're looking at a demo bakery with sample data.")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /Dashboard|Today/ }).length).toBeGreaterThan(0);
  });
});

describe("roles", () => {
  it("hides what staff can't do", async () => {
    localStorage.setItem("stocknest:v2:me", JSON.stringify("priya@maplestreetbakery.ca"));
    renderApp(<App />, { route: "/products" });
    expect(screen.queryByRole("button", { name: "Add product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Reports" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reports" })).not.toBeInTheDocument();
  });

  it("tells staff that Reports is for owners and managers", () => {
    localStorage.setItem("stocknest:v2:me", JSON.stringify("priya@maplestreetbakery.ca"));
    renderApp(<App />, { route: "/reports" });
    expect(screen.getByRole("heading", { name: "Reports is for owners and managers" })).toBeInTheDocument();
  });
});

describe("ordering several items at once", () => {
  it("puts everything from one supplier on one purchase order", async () => {
    renderApp(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Order by supplier" }));
    const dialog = screen.getByRole("dialog", { name: "Order by supplier" });
    await userEvent.click(within(dialog).getByRole("tab", { name: "Dairyland Foods (1)" }));
    await userEvent.click(within(dialog).getByRole("tab", { name: "PackRight (2)" }));
    expect(dialog).toHaveTextContent(/2 items · about \$\d/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Place order" }));

    const placed = screen.getByRole("dialog", { name: "PO #1046 placed" });
    expect(placed).toHaveTextContent("Cake boxes, 10 in");
    expect(placed).toHaveTextContent("Parchment paper, 100 sheets");
    await userEvent.click(within(placed).getByRole("button", { name: "Done" }));
    expect(screen.getAllByRole("button", { name: /Receive PO #1046/ })).toHaveLength(2);
  });
});

describe("scanning without a camera", () => {
  it("explains the camera can't start and lets you type the code", async () => {
    renderApp(<App />, { route: "/scan?id=ING-0012" });
    expect(await screen.findByText(/can't use the camera|secure \(https\) page/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Type a code instead" }));
    await userEvent.type(screen.getByLabelText("Barcode or SKU"), "ING-0031{Enter}");
    expect(screen.getByText("Ready: Unsalted butter, 454 g")).toBeInTheDocument();
  });
});
