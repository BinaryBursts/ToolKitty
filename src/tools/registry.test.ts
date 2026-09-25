import { describe, expect, it } from "vitest";

import { TOOL_CATEGORIES } from "./categories";
import {
  getAllTools,
  getFeaturedTools,
  getToolBySlug,
  getToolsByCategory,
  groupToolsByCategory,
} from "./registry";
import type { ToolCategory } from "./types";
import { SLUG_PATTERN } from "./validate";

describe("tool registry", () => {
  it("holds exactly the four launch tools, in registry order", () => {
    expect(getAllTools().map((tool) => tool.slug)).toEqual([
      "weight-converter",
      "temperature-converter",
      "password-generator",
      "json-formatter",
    ]);
  });

  it.each(getAllTools())(
    "$slug supplies every field the build requires",
    (tool) => {
      expect(tool.slug).toMatch(SLUG_PATTERN);
      expect(tool.name.trim()).not.toBe("");
      expect(tool.shortDescription.trim()).not.toBe("");
      expect(tool.seoTitle.trim()).not.toBe("");
      expect(tool.metaDescription.trim()).not.toBe("");
      expect(TOOL_CATEGORIES.map((category) => category.id)).toContain(
        tool.category,
      );
      expect(typeof tool.component).toBe("function");
    },
  );

  it("marks every launch tool as featured", () => {
    expect(getAllTools().every((tool) => tool.featured)).toBe(true);
  });
});

describe("getToolBySlug", () => {
  it("returns the entry with that slug", () => {
    const tool = getToolBySlug("json-formatter");

    expect(tool?.slug).toBe("json-formatter");
    expect(tool?.name).toBe("JSON Formatter");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getToolBySlug("does-not-exist")).toBeUndefined();
  });

  it("does not match on a different case or on a partial slug", () => {
    expect(getToolBySlug("JSON-Formatter")).toBeUndefined();
    expect(getToolBySlug("json")).toBeUndefined();
    expect(getToolBySlug("")).toBeUndefined();
  });
});

describe("getFeaturedTools", () => {
  it("returns the featured entries in registry order", () => {
    const featuredSlugs = getFeaturedTools().map((tool) => tool.slug);
    const registryOrder = getAllTools()
      .filter((tool) => tool.featured)
      .map((tool) => tool.slug);

    expect(featuredSlugs).toEqual(registryOrder);
  });

  it("returns only entries whose featured flag is set", () => {
    expect(getFeaturedTools().every((tool) => tool.featured)).toBe(true);
  });
});

describe("getToolsByCategory", () => {
  it("returns categories in their defined order", () => {
    expect(getToolsByCategory().map((group) => group.category.id)).toEqual([
      "converters",
      "generators-formatters",
    ]);
  });

  it("groups each tool under its own category, in registry order", () => {
    const groups = getToolsByCategory();

    expect(groups.map((group) => group.tools.map((tool) => tool.slug))).toEqual(
      [
        ["weight-converter", "temperature-converter"],
        ["password-generator", "json-formatter"],
      ],
    );
  });

  it("never returns a group with no tools in it", () => {
    expect(getToolsByCategory().every((group) => group.tools.length > 0)).toBe(
      true,
    );
  });

  it("accounts for every registered tool exactly once", () => {
    const grouped = getToolsByCategory().flatMap((group) =>
      group.tools.map((tool) => tool.slug),
    );

    expect([...grouped].sort()).toEqual(
      getAllTools()
        .map((tool) => tool.slug)
        .sort(),
    );
  });
});

describe("groupToolsByCategory", () => {
  const categories: readonly ToolCategory[] = [
    {
      id: "generators-formatters",
      name: "Generators & formatters",
      description: "Make something new.",
      order: 2,
    },
    {
      id: "converters",
      name: "Converters",
      description: "Change units.",
      order: 1,
    },
  ];

  it("drops a category with no tools in it", () => {
    const onlyConverters = getAllTools().filter(
      (tool) => tool.category === "converters",
    );

    const groups = groupToolsByCategory(onlyConverters, categories);

    expect(groups.map((group) => group.category.id)).toEqual(["converters"]);
  });

  it("returns nothing at all when there are no tools", () => {
    expect(groupToolsByCategory([], categories)).toEqual([]);
  });

  it("orders categories by their order field, not the order they are declared", () => {
    expect(
      groupToolsByCategory(getAllTools(), categories).map(
        (group) => group.category.id,
      ),
    ).toEqual(["converters", "generators-formatters"]);
  });

  it("keeps the given tool order inside a category", () => {
    const reversed = [...getAllTools()].reverse();

    const [firstGroup] = groupToolsByCategory(reversed, categories);

    expect(firstGroup?.tools.map((tool) => tool.slug)).toEqual([
      "temperature-converter",
      "weight-converter",
    ]);
  });
});
