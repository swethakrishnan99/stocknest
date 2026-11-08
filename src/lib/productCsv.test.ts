import { nextSku, productToRow, readProductRows, PRODUCT_CSV_HEADER } from "./productCsv";
import type { Product } from "../types";

const flour: Product = {
  id: "ING-0012",
  name: "All-purpose flour, 10 kg",
  initial: "F",
  tint: "#F3E9D7",
  cat: "Ingredients",
  loc: "Pantry",
  qty: 6,
  unit: "bags",
  reorder: 10,
  unitCost: 18.5,
  supplier: "Prairie Mills",
};
const header = PRODUCT_CSV_HEADER;
const CATS = ["Ingredients", "Packaging", "Baked goods", "Supplies"];

describe("nextSku", () => {
  it("picks the next number for the category", () => {
    expect(nextSku([{ id: "ING-0012" }, { id: "ING-0003" }, { id: "PKG-0100" }], "Ingredients")).toBe("ING-0013");
    expect(nextSku([], "Packaging")).toBe("PKG-0001");
  });
});

describe("readProductRows", () => {
  it("reads its own export back unchanged", () => {
    const { rows, errors } = readProductRows([header, productToRow(flour).map(String)], [flour], ["Pantry"], CATS);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ isNew: false, newLocation: false, product: { ...flour, barcode: "" } });
  });

  it("adds new products with a generated SKU and spots new locations", () => {
    const table = [header, ["", "Rye flour", "ingredients", "Back shelf", "8", "bags", "4", "$11.50", "", ""]];
    const { rows, errors } = readProductRows(table, [flour], ["Pantry"], CATS);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ isNew: true, newLocation: true, product: { id: "ING-0013", cat: "Ingredients", unitCost: 11.5, initial: "R" } });
  });

  it("matches location names without caring about case", () => {
    const table = [header, ["", "Rye flour", "Ingredients", "pantry", "8", "bags", "", "", "", ""]];
    expect(readProductRows(table, [], ["Pantry"], CATS).rows[0].product.loc).toBe("Pantry");
  });

  it("adds a category the business doesn't have yet", () => {
    const table = [header, ["", "Rubber duck", "Toys", "Pantry", "3", "pcs", "", "", "", ""]];
    expect(readProductRows(table, [], ["Pantry"], CATS).rows[0].product).toMatchObject({ cat: "Toys", id: "TOY-0001" });
  });

  it("explains what is wrong with a row", () => {
    const table = [header, ["", "", "", "", "-1", "", "x", "y", "", ""]];
    const { rows, errors } = readProductRows(table, [], [], CATS);
    expect(rows).toEqual([]);
    expect(errors[0].line).toBe(2);
    expect(errors[0].message).toMatch(/name is missing/);
    expect(errors[0].message).toMatch(/category is missing/);
    expect(errors[0].message).toMatch(/on hand must be a whole number/);
    expect(errors[0].message).toMatch(/unit cost must be a number/);
  });

  it("rejects duplicate SKUs and files with missing columns", () => {
    const dup = [header, productToRow(flour).map(String), productToRow(flour).map(String)];
    expect(readProductRows(dup, [flour], ["Pantry"], CATS).errors[0].message).toMatch(/appears twice/);
    expect(readProductRows([["Name", "Unit"]], [], [], CATS).errors[0].message).toBe("Missing columns: Category, Location, On hand.");
    expect(readProductRows([], [], [], CATS).errors[0].message).toBe("The file is empty.");
  });
});
