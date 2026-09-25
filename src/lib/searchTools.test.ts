import { describe, expect, it } from "vitest";

import { getToolListings } from "@/tools/registry";

import {
  filterTools,
  normaliseQuery,
  type SearchableTool,
} from "./searchTools";

/** A tiny stand-in set, so the rules are tested rather than the registry. */
const TOOLS: readonly (SearchableTool & { readonly slug: string })[] = [
  {
    slug: "weight-converter",
    name: "Weight Converter",
    shortDescription: "Convert between kilograms, pounds and stones.",
    keywords: ["mass", "kg", "lb"],
  },
  {
    slug: "temperature-converter",
    name: "Temperature Converter",
    shortDescription: "Convert between Celsius, Fahrenheit and Kelvin.",
    keywords: ["oven", "weather"],
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    shortDescription: "Beautify and indent JSON.",
    keywords: ["pretty print", "api"],
  },
];

const slugs = (query: string): readonly string[] =>
  filterTools(TOOLS, query).map((tool) => tool.slug);

describe("normaliseQuery", () => {
  it("drops surrounding whitespace and case", () => {
    expect(normaliseQuery("  TEMP ")).toBe("temp");
  });
});

describe("filterTools", () => {
  it("returns every tool for an empty query", () => {
    expect(filterTools(TOOLS, "")).toEqual(TOOLS);
  });

  it("returns every tool for a query that is only whitespace", () => {
    expect(filterTools(TOOLS, "   ")).toEqual(TOOLS);
  });

  it("matches a substring of the tool's name", () => {
    expect(slugs("temp")).toEqual(["temperature-converter"]);
  });

  it("matches a substring of the short description", () => {
    expect(slugs("kilograms")).toEqual(["weight-converter"]);
  });

  it("matches a keyword that appears nowhere else in the entry", () => {
    expect(slugs("oven")).toEqual(["temperature-converter"]);
    expect(slugs("api")).toEqual(["json-formatter"]);
  });

  it("matches inside a multi-word keyword", () => {
    expect(slugs("pretty")).toEqual(["json-formatter"]);
  });

  it("ignores case on both sides of the comparison", () => {
    expect(slugs("TEMP")).toEqual(slugs("temp"));
    expect(slugs("json")).toEqual(["json-formatter"]);
  });

  it("ignores leading and trailing whitespace", () => {
    expect(slugs(" TEMP ")).toEqual(slugs("temp"));
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterTools(TOOLS, "zzz")).toEqual([]);
  });

  it("keeps the order it was given rather than ranking matches", () => {
    expect(slugs("convert")).toEqual([
      "weight-converter",
      "temperature-converter",
    ]);
  });

  it("matches substrings rather than fuzzily", () => {
    // Every letter of "tmp" is in "Temperature", in order — a fuzzy matcher
    // would return it. This one must not.
    expect(filterTools(TOOLS, "tmp")).toEqual([]);
  });

  it("narrows the real registry to the temperature converter for 'temp'", () => {
    expect(
      filterTools(getToolListings(), "temp").map((tool) => tool.slug),
    ).toEqual(["temperature-converter"]);
  });
});
