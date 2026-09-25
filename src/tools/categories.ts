import type { CategoryId, ToolCategory } from "./types";

/**
 * The category list (REQ-2, REQ-4): the sections the homepage directory groups
 * tools by, in the order they appear.
 *
 * Adding a category means adding it to {@link CategoryId} in `./types.ts` and
 * to this array; the compiler then requires an entry for every id.
 */
export const TOOL_CATEGORIES: readonly ToolCategory[] = [
  {
    id: "converters",
    name: "Converters",
    description: "Change a value from one unit into another.",
    order: 1,
  },
  {
    id: "generators-formatters",
    name: "Generators & formatters",
    description: "Make something new, or tidy up what you already have.",
    order: 2,
  },
] satisfies readonly (ToolCategory & { id: CategoryId })[];

/**
 * Compile-time check that every category id has exactly one entry above. If a
 * new id is added to {@link CategoryId} without a category here, this line
 * fails to type-check.
 */
const _categoriesAreExhaustive: Record<CategoryId, true> = {
  converters: true,
  "generators-formatters": true,
};
void _categoriesAreExhaustive;

/** Every category, ascending by `order`. */
export const getCategoriesInOrder = (): readonly ToolCategory[] =>
  [...TOOL_CATEGORIES].sort((a, b) => a.order - b.order);

/** The category with this id, or `undefined` when the id is unknown. */
export const getCategoryById = (id: string): ToolCategory | undefined =>
  TOOL_CATEGORIES.find((category) => category.id === id);

/** True when `value` is one of the known category ids. */
export const isCategoryId = (value: unknown): value is CategoryId =>
  typeof value === "string" && getCategoryById(value) !== undefined;
