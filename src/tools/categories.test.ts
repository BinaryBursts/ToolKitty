import { describe, expect, it } from "vitest";

import {
  getCategoriesInOrder,
  getCategoryById,
  isCategoryId,
  TOOL_CATEGORIES,
} from "./categories";

describe("tool categories", () => {
  it("defines converters and generators & formatters, with display names", () => {
    expect(
      TOOL_CATEGORIES.map((category) => [category.id, category.name]),
    ).toEqual([
      ["converters", "Converters"],
      ["generators-formatters", "Generators & formatters"],
    ]);
  });

  it("gives every category a one-line description for the directory heading", () => {
    for (const category of TOOL_CATEGORIES) {
      expect(category.description.trim()).not.toBe("");
    }
  });

  it("has a unique id and a unique order per category", () => {
    const ids = TOOL_CATEGORIES.map((category) => category.id);
    const orders = TOOL_CATEGORIES.map((category) => category.order);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(orders).size).toBe(orders.length);
  });
});

describe("getCategoriesInOrder", () => {
  it("returns categories ascending by order", () => {
    const orders = getCategoriesInOrder().map((category) => category.order);

    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("does not reorder the exported array itself", () => {
    const before = TOOL_CATEGORIES.map((category) => category.id);

    getCategoriesInOrder();

    expect(TOOL_CATEGORIES.map((category) => category.id)).toEqual(before);
  });
});

describe("getCategoryById", () => {
  it("returns the category with that id", () => {
    expect(getCategoryById("converters")?.name).toBe("Converters");
  });

  it("returns undefined for an unknown id", () => {
    expect(getCategoryById("gadgets")).toBeUndefined();
  });
});

describe("isCategoryId", () => {
  it("accepts known ids and rejects anything else", () => {
    expect(isCategoryId("converters")).toBe(true);
    expect(isCategoryId("generators-formatters")).toBe(true);
    expect(isCategoryId("gadgets")).toBe(false);
    expect(isCategoryId("")).toBe(false);
    expect(isCategoryId(undefined)).toBe(false);
    expect(isCategoryId(7)).toBe(false);
  });
});
