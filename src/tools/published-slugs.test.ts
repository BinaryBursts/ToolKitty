import { describe, expect, it } from "vitest";

import publishedSlugs from "./published-slugs.lock.json";
import { getAllTools, getToolBySlug } from "./registry";

/**
 * Tool URLs are permanent (REQ-2). `published-slugs.lock.json` is the record of
 * which ones have been published; this test is what stops one being renamed or
 * deleted by accident, which would break every link and bookmark pointing at it
 * and throw away its search ranking.
 */
describe("published tool slugs", () => {
  const locked: readonly string[] = publishedSlugs.slugs;

  it("lists at least the four launch tools", () => {
    expect(locked).toEqual(
      expect.arrayContaining([
        "weight-converter",
        "temperature-converter",
        "password-generator",
        "json-formatter",
      ]),
    );
  });

  it.each(locked)(
    "still serves the published slug %s from the registry",
    (slug) => {
      expect(
        getToolBySlug(slug),
        `The published URL /tools/${slug} has gone from the tool registry. ` +
          `Tool URLs are permanent: restore the entry, and if the tool was ` +
          `renamed change its display name rather than its slug.`,
      ).toBeDefined();
    },
  );

  it("has no duplicate entries in the lockfile", () => {
    expect(new Set(locked).size).toBe(locked.length);
  });

  it("does not list a slug the registry has never had", () => {
    const registrySlugs = new Set(getAllTools().map((tool) => tool.slug));

    expect(locked.filter((slug) => !registrySlugs.has(slug))).toEqual([]);
  });
});
