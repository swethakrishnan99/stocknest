import type { Role } from "../types";

// What each role may do. Everyone can record stock movements, scan, count and receive deliveries.
export type Permission =
  | "editProducts" // add, edit, delete, import products; add locations; move stock
  | "order" // place and cancel purchase orders, manage suppliers
  | "viewReports"
  | "manageTeam" // invite people and change roles
  | "manageBusiness" // business details, categories, alerts
  | "manageData"; // backups, restore, start over

const ALLOWED: Record<Role, Permission[]> = {
  Owner: ["editProducts", "order", "viewReports", "manageTeam", "manageBusiness", "manageData"],
  Manager: ["editProducts", "order", "viewReports", "manageBusiness"],
  Staff: [],
};

export const can = (role: Role | undefined, permission: Permission) => !!role && ALLOWED[role].includes(permission);

export const ROLE_HINTS: Record<Role, string> = {
  Owner: "Everything, including the team, backups and starting over",
  Manager: "Adds products, orders stock, sees reports and changes settings",
  Staff: "Records stock in and out, counts and receives deliveries",
};
