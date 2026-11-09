import { screen } from "@testing-library/react";
import App from "../App";
import { renderApp } from "../test/render";
import { buildSampleData } from "../lib/sampleHistory";
import { upgradeBusiness, upgradeTeam } from "../lib/upgradeSaved";

// What the version before the five gaps saved: no mode, no categories, no alerts, suppliers or batches
function saveLikeTheOldVersion() {
  const { products, movements, locations } = buildSampleData("2026-11-06", 600);
  const save = (key: string, value: unknown) => localStorage.setItem(`stocknest:v2:${key}`, JSON.stringify(value));
  save("products", products);
  save("movements", movements);
  save("locations", locations);
  save("orders", {});
  save("nextPo", 1046);
  save("business", { name: "Maple Street Bakery", currency: "CAD · Canadian dollar", timeZone: "Eastern Time (Toronto)", defaultReorder: "10" });
  save("team", [
    { name: "Alex Moreau", email: "alex@maplestreetbakery.ca", role: "Owner" },
    { name: "Priya Shah", email: "priya@maplestreetbakery.ca", role: "Staff" },
  ]);
}

describe("data saved by an older version", () => {
  it("still opens, straight into the demo it was using", () => {
    saveLikeTheOldVersion();
    renderApp(<App />, { mode: null });
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Stock value by category")).toBeInTheDocument();
    expect(screen.getByText("You're looking at a demo bakery with sample data.")).toBeInTheDocument();
  });

  it("fills in missing business fields and unknown roles", () => {
    expect(upgradeBusiness({ name: "Old" }, [{ cat: "Toys" }, { cat: "Toys" }, { cat: "Games" }])).toMatchObject({ name: "Old", categories: ["Toys", "Games"], type: "bakery" });
    expect(upgradeBusiness(null, []).categories).toEqual(["Ingredients", "Packaging", "Baked goods", "Supplies"]);
    expect(upgradeTeam([{ name: "A", email: "a", role: "Admin" as never }, { name: "B", email: "b", role: "Boss" as never }]).map((m) => m.role)).toEqual(["Manager", "Staff"]);
  });
});
