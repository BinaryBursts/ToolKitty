import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import type * as ToolRegistry from "./registry";
import type { ToolDefinition } from "./types";

/**
 * A rehearsal of the promise REQ-2 makes: **adding a tool is one component file
 * and one registry entry, and nothing else.**
 *
 * Rather than trusting that, this test adds a fifth tool — here, in a fixture —
 * and checks that everything derived from the registry picks it up on its own:
 * the routes the static export builds, the directory's grouping, the search
 * index and the sitemap's source of URLs. Nothing else is edited, because there
 * is nothing else to edit; if that ever stops being true, this test is where it
 * shows.
 *
 * Two of those four are not built yet — tool search is TKT-9 and the sitemap is
 * the REQ-13 pass. Both are specified to read the registry, so what this test
 * can check today is that the registry's own list is the single source they
 * will read, and that no other file in the app or the shell names a slug of its
 * own. When search and the sitemap land, assert them here directly.
 */

/** The fifth tool: a component file and a registry entry, and that is all. */
function UnitPriceCalculator() {
  return <p>Unit price calculator body</p>;
}

const FIFTH_TOOL: ToolDefinition = {
  slug: "unit-price-calculator",
  name: "Unit Price Calculator",
  shortDescription: "Work out which pack size is actually the better value.",
  category: "converters",
  keywords: ["unit price", "value", "shopping"],
  seoTitle: "Unit Price Calculator — compare pack sizes | ToolKitty",
  metaDescription:
    "Compare pack sizes by price per unit, in your browser. Nothing you type is sent anywhere.",
  featured: false,
  component: UnitPriceCalculator,
  supportingCopy: ["Enter each pack's price and size to see the cheaper one."],
};

// The registry with a fifth entry in it, exactly as a developer adding a tool
// would leave it. Every module under test below reads the registry through
// these functions, so this is the only change the fixture has to make.
vi.mock("@/tools/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof ToolRegistry>();
  const tools: readonly ToolDefinition[] = [
    ...actual.getAllTools(),
    FIFTH_TOOL,
  ];

  return {
    ...actual,
    getAllTools: () => tools,
    getToolBySlug: (slug: string) => tools.find((tool) => tool.slug === slug),
    getFeaturedTools: () => tools.filter((tool) => tool.featured),
    getToolsByCategory: () => actual.groupToolsByCategory(tools),
  };
});

describe("adding a fifth tool", () => {
  it("builds a page for it, with no routing file touched", async () => {
    const { generateStaticParams } = await import("@/app/tools/[slug]/page");

    expect(generateStaticParams()).toContainEqual({
      slug: "unit-price-calculator",
    });
  });

  it("gives it a title, description and canonical URL of its own", async () => {
    const { generateMetadata } = await import("@/app/tools/[slug]/page");

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "unit-price-calculator" }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toEqual({ absolute: FIFTH_TOOL.seoTitle });
    expect(metadata.description).toBe(FIFTH_TOOL.metaDescription);
    expect(metadata.alternates?.canonical).toContain(
      "/tools/unit-price-calculator",
    );
  });

  it("renders its page from the shared template", async () => {
    const ToolPage = (await import("@/app/tools/[slug]/page")).default;

    render(
      (await ToolPage({
        params: Promise.resolve({ slug: "unit-price-calculator" }),
        searchParams: Promise.resolve({}),
      })) as ReactElement,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: FIFTH_TOOL.name }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unit price calculator body")).toBeInTheDocument();
  });

  it("appears in the directory, under its own category", async () => {
    const { getToolsByCategory } = await import("@/tools/registry");

    const converters = getToolsByCategory().find(
      (group) => group.category.id === "converters",
    );

    expect(converters?.tools.map((tool) => tool.slug)).toContain(
      "unit-price-calculator",
    );
  });

  it("is in the list tool search and the sitemap are built from", async () => {
    const { getAllTools } = await import("@/tools/registry");

    // Tool search (TKT-9) and the sitemap (REQ-13) both enumerate the registry;
    // this is the list they enumerate, and the fifth tool — with its keywords
    // for search and its slug for the sitemap — is in it.
    const entry = getAllTools().find(
      (tool) => tool.slug === "unit-price-calculator",
    );

    expect(entry).toBeDefined();
    expect(entry?.keywords).toContain("unit price");
    expect(getAllTools()).toHaveLength(5);
  });

  it("shows up at the foot of every other tool's page", async () => {
    const ToolPage = (await import("@/app/tools/[slug]/page")).default;

    const { container } = render(
      (await ToolPage({
        params: Promise.resolve({ slug: "weight-converter" }),
        searchParams: Promise.resolve({}),
      })) as ReactElement,
    );

    const hrefs = [
      ...container.querySelectorAll('[data-section="more-tools"] a.t-tool'),
    ].map((a) => a.getAttribute("href"));

    expect(hrefs).toContain("/tools/unit-price-calculator");
  });
});

/**
 * The other half of "nothing else to edit": no page, shell component or route
 * in the site writes a tool slug of its own. If one did, a fifth tool would
 * need that file edited too, and the tests above would pass while the promise
 * quietly broke.
 */
describe("no file outside the registry names a tool slug", () => {
  // Vitest runs from the repository root (see vitest.config.mts).
  const sourceRoot = join(process.cwd(), "src");

  const files = ["app", "components"].flatMap((directory) =>
    readdirSync(join(sourceRoot, directory), {
      recursive: true,
      encoding: "utf8",
    })
      .map((entry) => join(directory, entry))
      .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test.")),
  );

  it("scans the app and the shell", () => {
    // A guard on the scan itself: an empty list would pass every check below.
    expect(files.length).toBeGreaterThan(5);
  });

  /**
   * Comments are stripped first. What matters is that no file *behaves*
   * differently for a named tool; a comment that mentions a slug in prose —
   * "the approved weight converter screen", say — is documentation, not a
   * hard-coded route. Line comments are only stripped where they start a line,
   * so a `https://` inside a string is left alone.
   */
  const codeOnly = (contents: string): string =>
    contents.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("still sees a slug written in code, and ignores one written in prose", () => {
    expect(codeOnly('const href = "/tools/weight-converter";')).toContain(
      "weight-converter",
    );
    expect(
      codeOnly("  // the approved weight-converter screen\n"),
    ).not.toContain("weight-converter");
    expect(codeOnly("/** the weight-converter screen */\n")).not.toContain(
      "weight-converter",
    );
  });

  it.each(files)("%s hard-codes no slug", (file) => {
    const contents = codeOnly(readFileSync(join(sourceRoot, file), "utf8"));

    for (const slug of [
      "weight-converter",
      "temperature-converter",
      "password-generator",
      "json-formatter",
    ]) {
      expect(
        contents.includes(slug),
        `${file} names the slug "${slug}". Tool pages, navigation, search and ` +
          `the sitemap must all derive slugs from the registry, so that adding ` +
          `a tool stays a one-entry change.`,
      ).toBe(false);
    }
  });
});
