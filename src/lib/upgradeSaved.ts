// Data saved by an older version of StockNest can lack fields added since. These fill them in
// when the data loads, so an update never breaks a browser that already has data.
import { DEFAULT_BUSINESS } from "./sampleData";
import type { Business, Product, Role, TeamMember } from "../types";

/** Business details with every field present; categories come from the products if they were never saved */
export function upgradeBusiness(saved: Partial<Business> | null | undefined, products: Pick<Product, "cat">[]): Business {
  const s = saved ?? {};
  const fromProducts = [...new Set(products.map((p) => p.cat).filter(Boolean))];
  const categories = Array.isArray(s.categories) && s.categories.length ? s.categories : fromProducts.length ? fromProducts : DEFAULT_BUSINESS.categories;
  return { ...DEFAULT_BUSINESS, ...s, categories };
}

const ROLES: Role[] = ["Owner", "Manager", "Staff"];

/** Team members with a role the app knows ("Admin" from early versions becomes Manager) */
export function upgradeTeam(saved: TeamMember[] | null | undefined): TeamMember[] {
  if (!Array.isArray(saved)) return [];
  return saved.map((m) => {
    const role = m.role as string;
    return { ...m, role: ROLES.includes(role as Role) ? (role as Role) : role === "Admin" ? "Manager" : "Staff" };
  });
}
