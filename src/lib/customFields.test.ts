import {
  EMPTY_FILTER,
  checkField,
  checkValue,
  cleanFieldValues,
  displayValue,
  fieldsMatch,
  matchesFieldFilter,
  mergeFieldValues,
  newFieldId,
  parseOptions,
} from "./customFields";
import type { CustomField } from "../types";

const size: CustomField = { id: "size", name: "Size", type: "choice", options: ["S", "M", "L"] };
const weight: CustomField = { id: "weight", name: "Weight", type: "number" };
const expiry: CustomField = { id: "expiry", name: "Expiry", type: "date" };
const colour: CustomField = { id: "colour", name: "Colour", type: "text" };
const FIELDS = [size, weight, expiry, colour];

describe("newFieldId", () => {
  it("is based on the name and never repeats", () => {
    expect(newFieldId("Warranty expiry!", [])).toBe("warranty-expiry");
    expect(newFieldId("Size", [size])).toBe("size-2");
    expect(newFieldId("Size", [size, { id: "size-2" }])).toBe("size-3");
    expect(newFieldId("***", [])).toBe("field");
  });
});

describe("parseOptions", () => {
  it("splits on commas and drops blanks and repeats", () => {
    expect(parseOptions(" S, M ,, m, L ")).toEqual(["S", "M", "L"]);
  });
});

describe("checkField", () => {
  it("needs a name that isn't taken, and options for a choice", () => {
    expect(checkField({ name: " ", type: "text" }, [])).toMatch(/Enter a name/);
    expect(checkField({ name: "size", type: "text" }, [size])).toBe("There's already a field called size.");
    expect(checkField({ name: "Fit", type: "choice", options: [] }, [])).toMatch(/at least one option/);
    expect(checkField({ name: "Fit", type: "choice", options: ["Slim"] }, [size])).toBe("");
  });
});

describe("checkValue and cleanValue", () => {
  it("allows empty values and checks the rest by type", () => {
    expect(checkValue(weight, "")).toBe("");
    expect(checkValue(weight, "2.5")).toBe("");
    expect(checkValue(weight, "heavy")).toBe("Weight must be a number.");
    expect(checkValue(expiry, "2027-02-30")).toMatch(/must be a date/);
    expect(checkValue(expiry, "2027-02-28")).toBe("");
    expect(checkValue(size, "xl")).toBe("Size must be one of: S, M, L.");
    expect(checkValue(size, "m")).toBe("");
  });

  it("saves a choice spelled like its option and leaves out empty values", () => {
    expect(cleanFieldValues(FIELDS, { size: "m", weight: " ", colour: " Sand " })).toEqual({ size: "M", colour: "Sand" });
    expect(cleanFieldValues(FIELDS, { size: "" })).toBeUndefined();
  });

  it("keeps values of removed fields when a product is edited", () => {
    expect(mergeFieldValues([size], { size: "S", old: "kept" }, { size: "L" })).toEqual({ old: "kept", size: "L" });
    expect(mergeFieldValues([size], { size: "S" }, { size: "" })).toBeUndefined();
  });
});

describe("searching and filtering", () => {
  const shirt = { fields: { size: "M", colour: "Sand", expiry: "2027-03-04" } };
  const plain = {};

  it("finds products by any field value, including dates as shown", () => {
    expect(displayValue(expiry, "2027-03-04")).toBe("Mar 4, 2027");
    expect(fieldsMatch(shirt, FIELDS, "sand")).toBe(true);
    expect(fieldsMatch(shirt, FIELDS, "mar 4")).toBe(true);
    expect(fieldsMatch(plain, FIELDS, "sand")).toBe(false);
  });

  it("filters by an option, by any value, by text or by no value", () => {
    expect(matchesFieldFilter(shirt, size, "M")).toBe(true);
    expect(matchesFieldFilter(shirt, size, "L")).toBe(false);
    expect(matchesFieldFilter(shirt, colour, "")).toBe(true);
    expect(matchesFieldFilter(plain, colour, "")).toBe(false);
    expect(matchesFieldFilter(shirt, colour, "an")).toBe(true);
    expect(matchesFieldFilter(plain, size, EMPTY_FILTER)).toBe(true);
    expect(matchesFieldFilter(shirt, size, EMPTY_FILTER)).toBe(false);
  });
});
