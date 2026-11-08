import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProductSearch from "./ProductSearch";
import { renderApp } from "../test/render";

describe("ProductSearch", () => {
  it("lists matches as you type and opens one with the keyboard", async () => {
    const onOpen = vi.fn();
    const onSeeAll = vi.fn();
    renderApp(<ProductSearch onOpenProduct={onOpen} onSeeAll={onSeeAll} />);
    const box = screen.getByRole("combobox");
    await userEvent.type(box, "butter");
    expect(screen.getByRole("option", { name: /Unsalted butter/ })).toBeInTheDocument();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onOpen).toHaveBeenCalledWith("ING-0031");
  });

  it("finds products by barcode digits, and Enter without a pick shows all results", async () => {
    const onOpen = vi.fn();
    const onSeeAll = vi.fn();
    renderApp(<ProductSearch onOpenProduct={onOpen} onSeeAll={onSeeAll} />);
    await userEvent.type(screen.getByRole("combobox"), "41237");
    expect(screen.getByRole("option", { name: /All-purpose flour/ })).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(onSeeAll).toHaveBeenCalledWith("41237");
    expect(onOpen).not.toHaveBeenCalled();
  });
});
