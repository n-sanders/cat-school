import site from "../../site.config";

export { site };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Display nouns for catalog items, e.g. { one: "rocket", many: "rockets", One: "Rocket", Many: "Rockets" }. */
export const noun = {
  one: site.catalog.singular,
  many: site.catalog.plural,
  One: capitalize(site.catalog.singular),
  Many: capitalize(site.catalog.plural),
};

export const categoryLabel = (id: string) => site.catalog.categories.find((c) => c.id === id)?.label ?? id;
