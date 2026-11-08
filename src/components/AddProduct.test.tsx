import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddProduct from "./AddProduct";
import { renderApp } from "../test/render";

describe("AddProduct", () => {
  it("checks the form before adding", async () => {
    const onAdd = vi.fn();
    renderApp(<AddProduct onAdd={onAdd} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));
    expect(screen.getByText("Enter a product name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a unit, like bags or pcs.")).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("adds a product with the next free SKU", async () => {
    const onAdd = vi.fn();
    renderApp(<AddProduct onAdd={onAdd} onClose={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText("e.g. Rye flour, 5 kg"), "Rye flour, 5 kg");
    await userEvent.type(document.querySelector<HTMLInputElement>('[name="unit"]')!, "bags");
    await userEvent.type(document.querySelector<HTMLInputElement>('[name="qty"]')!, "8");
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: "ING-0075", name: "Rye flour, 5 kg", cat: "Ingredients", qty: 8, unit: "bags", initial: "R" }));
  });
});
