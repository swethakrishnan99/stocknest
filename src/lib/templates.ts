// Starting points for a new business: which categories and locations to begin with.
// Everything can be changed later (Settings for categories, Locations for places).

export interface BusinessTemplate {
  id: string;
  label: string;
  hint: string;
  categories: string[];
  locations: { name: string; kind: string }[];
}

export const TEMPLATES: BusinessTemplate[] = [
  {
    id: "bakery",
    label: "Bakery or café",
    hint: "Ingredients, packaging and what you bake",
    categories: ["Ingredients", "Packaging", "Baked goods", "Supplies"],
    locations: [
      { name: "Pantry", kind: "Dry goods shelves" },
      { name: "Fridge", kind: "Cold storage" },
      { name: "Front counter", kind: "Display and shelves" },
    ],
  },
  {
    id: "retail",
    label: "Shop or boutique",
    hint: "Products you sell and shop supplies",
    categories: ["Products for sale", "Packaging", "Shop supplies"],
    locations: [
      { name: "Shop floor", kind: "Shelves and displays" },
      { name: "Back room", kind: "Extra stock" },
    ],
  },
  {
    id: "beauty",
    label: "Salon or beauty",
    hint: "Retail products, salon supplies and tools",
    categories: ["Retail products", "Salon supplies", "Tools"],
    locations: [
      { name: "Front desk", kind: "Retail display" },
      { name: "Back room", kind: "Supplies cupboard" },
    ],
  },
  {
    id: "home",
    label: "Home business or crafts",
    hint: "Materials, finished goods and packaging",
    categories: ["Materials", "Finished goods", "Packaging"],
    locations: [
      { name: "Workspace", kind: "Where you make things" },
      { name: "Storage", kind: "Boxes and shelves" },
    ],
  },
  {
    id: "other",
    label: "Something else",
    hint: "Start simple and add your own",
    categories: ["Products", "Supplies"],
    locations: [{ name: "Main storage", kind: "" }],
  },
];

export const templateFor = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1];

// Tile colours for categories, by position
const TINTS = ["#F3E9D7", "#FDE3DF", "#E6DCF5", "#DCEAF7", "#E3F1E3", "#FBF1C9", "#EEF0F5", "#F9E0EC"];
export const tintFor = (categories: string[], cat: string) => TINTS[Math.max(0, categories.indexOf(cat)) % TINTS.length];

const KNOWN_PREFIX: Record<string, string> = { Ingredients: "ING", Packaging: "PKG", "Baked goods": "BKD", Supplies: "SUP" };

/** SKU prefix for a category: the sample's own prefixes, otherwise the first three letters */
export function skuPrefix(cat: string): string {
  if (KNOWN_PREFIX[cat]) return KNOWN_PREFIX[cat];
  const letters = cat.replace(/[^a-z]/gi, "").toUpperCase();
  return (letters + "XXX").slice(0, 3);
}
