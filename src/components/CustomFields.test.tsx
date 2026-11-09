import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import AddProduct from "./AddProduct";
import { renderApp } from "../test/render";

describe("custom fields", () => {
  it("adds a choice field in Settings, fills it in on a product and filters Products by it", async () => {
    renderApp(<App />, { route: "/settings" });
    const card = screen.getByRole("region", { name: "Custom fields" });
    expect(within(card).getByText("Allergens")).toBeInTheDocument(); // the demo bakery's fields

    await userEvent.click(within(card).getByRole("button", { name: "Add custom field" }));
    await userEvent.click(within(card).getByRole("button", { name: "Add field" }));
    expect(within(card).getByRole("alert")).toHaveTextContent("Enter a name for the field.");

    await userEvent.type(within(card).getByLabelText("Field name"), "Shelf life");
    await userEvent.selectOptions(within(card).getByLabelText(/^Type/), "choice");
    await userEvent.click(within(card).getByRole("button", { name: "Add field" }));
    expect(within(card).getByRole("alert")).toHaveTextContent("Add at least one option");
    await userEvent.type(within(card).getByLabelText(/^Options/), "1 day, 1 week, 1 month");
    await userEvent.click(within(card).getByRole("button", { name: "Add field" }));
    expect(within(card).getByText("Choice: 1 day, 1 week, 1 month · 0 products")).toBeInTheDocument();

    // Give the croissant a shelf life
    await userEvent.click(screen.getAllByRole("button", { name: "Products" })[0]);
    await userEvent.type(screen.getByRole("searchbox", { name: "Search products" }), "Croissant");
    await userEvent.click(screen.getByRole("button", { name: "Croissant" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit product" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Shelf life/), "1 day");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Shelf life:")).toBeInTheDocument();

    // Filter Products by it
    await userEvent.click(screen.getByRole("button", { name: "Back to products" }));
    await userEvent.clear(screen.getByRole("searchbox", { name: "Search products" }));
    await userEvent.selectOptions(screen.getByLabelText("Field"), "Shelf life");
    await userEvent.selectOptions(screen.getByLabelText("Shelf life is"), "1 day");
    expect(screen.getByText(/Showing 1–1 of 1 \(51/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Croissant" })).toBeInTheDocument();
  });

  it("finds products by a field value in the search box and in the field filter", async () => {
    renderApp(<App />, { route: "/products" });
    await userEvent.type(screen.getByRole("searchbox", { name: "Search products" }), "tree nuts");
    expect(screen.getByRole("button", { name: "Walnut halves, 1 kg" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maple pecan tart" })).toBeInTheDocument();
    expect(screen.getByText(/Showing 1–2 of 2/)).toBeInTheDocument();

    await userEvent.clear(screen.getByRole("searchbox", { name: "Search products" }));
    await userEvent.selectOptions(screen.getByLabelText("Field"), "Storage");
    await userEvent.selectOptions(screen.getByLabelText("Storage is"), "Frozen");
    expect(screen.getByText(/Showing 1–3 of 3/)).toBeInTheDocument();
  });

  it("saves field values with a new product and checks them", async () => {
    const onAdd = vi.fn();
    renderApp(<AddProduct onAdd={onAdd} onClose={() => {}} />);
    await userEvent.type(screen.getByPlaceholderText("e.g. Rye flour, 5 kg"), "Spelt flour");
    await userEvent.type(document.querySelector<HTMLInputElement>('[name="unit"]')!, "bags");
    await userEvent.type(document.querySelector<HTMLInputElement>('[name="qty"]')!, "4");
    await userEvent.click(screen.getByRole("button", { name: /More details/ }));
    await userEvent.type(screen.getByLabelText(/^Allergens/), "Wheat");
    await userEvent.selectOptions(screen.getByLabelText(/^Storage/), "Dry");
    await userEvent.click(screen.getByRole("button", { name: "Add product" }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Spelt flour", fields: { allergens: "Wheat", storage: "Dry" } }));
  });
});
