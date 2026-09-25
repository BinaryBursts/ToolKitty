import { describe, expect, it } from "vitest";

import { TOOL_CATEGORIES } from "./categories";
import { getAllTools } from "./registry";
import type { ToolDefinition } from "./types";
import { SLUG_PATTERN, ToolRegistryError, validateTools } from "./validate";

/**
 * A stand-in tool component. It takes no props, because the registry's type
 * will not accept one that does (REQ-2: a tool must not require props from
 * outside the registry).
 */
const ExampleToolComponent = () => null;

/**
 * A sound entry to mutate. Each test breaks exactly one thing, the way a
 * developer would break it while adding a tool, and checks the build-time error
 * names the entry at fault (REQ-2).
 */
const validEntry = (
  overrides: Partial<ToolDefinition> = {},
): ToolDefinition => ({
  slug: "example-tool",
  name: "Example Tool",
  shortDescription: "Does something useful.",
  category: "converters",
  keywords: ["example"],
  seoTitle: "Example Tool | ToolKitty",
  metaDescription: "An example tool used in tests.",
  featured: false,
  component: ExampleToolComponent,
  supportingCopy: ["Some supporting copy."],
  ...overrides,
});

/** Blanking a required field is only possible past the type, as JS can do. */
const without = (
  field: keyof ToolDefinition,
  overrides: Partial<ToolDefinition> = {},
): ToolDefinition => {
  const entry: Record<string, unknown> = { ...validEntry(overrides) };
  delete entry[field];
  return entry as unknown as ToolDefinition;
};

describe("validateTools", () => {
  it("accepts the live registry", () => {
    expect(() => validateTools(getAllTools(), TOOL_CATEGORIES)).not.toThrow();
  });

  it("accepts an empty registry", () => {
    expect(() => validateTools([])).not.toThrow();
  });

  it("accepts several distinct, well-formed entries", () => {
    expect(() =>
      validateTools([
        validEntry({ slug: "first-tool", name: "First Tool" }),
        validEntry({
          slug: "second-tool",
          name: "Second Tool",
          category: "generators-formatters",
        }),
      ]),
    ).not.toThrow();
  });
});

describe("validateTools: duplicate slugs", () => {
  it("throws naming the duplicate slug and the offending entry", () => {
    const tools = [
      validEntry({ slug: "weight-converter", name: "Weight Converter" }),
      validEntry({ slug: "weight-converter", name: "Weight Converter Copy" }),
    ];

    expect(() => validateTools(tools)).toThrow(ToolRegistryError);
    expect(() => validateTools(tools)).toThrow(/weight-converter/);
    expect(() => validateTools(tools)).toThrow(/Weight Converter Copy/);
  });

  it("treats slugs differing only by surrounding space as duplicates", () => {
    const tools = [
      validEntry({ slug: "shared-slug", name: "First" }),
      validEntry({ slug: " shared-slug ", name: "Second" }),
    ];

    expect(() => validateTools(tools)).toThrow(/shared-slug/);
  });
});

describe("validateTools: slug format", () => {
  const badSlugs = [
    "Weight-Converter",
    "weight converter",
    "weight_converter",
    "-weight-converter",
    "weight-converter-",
    "weight--converter",
    "weight/converter",
    "weight.converter",
    "wéight-converter",
  ];

  it.each(badSlugs)("rejects the slug %s, naming the entry", (slug) => {
    const tools = [validEntry({ slug, name: "Badly Slugged Tool" })];

    expect(() => validateTools(tools)).toThrow(/Badly Slugged Tool/);
    expect(() => validateTools(tools)).toThrow(/invalid slug/);
  });

  const goodSlugs = ["json-formatter", "base64", "utf-8-decoder", "qr2png"];

  it.each(goodSlugs)("accepts the slug %s", (slug) => {
    expect(() => validateTools([validEntry({ slug })])).not.toThrow();
  });

  it("exports the slug pattern it enforces", () => {
    expect(SLUG_PATTERN.test("json-formatter")).toBe(true);
    expect(SLUG_PATTERN.test("JSON_Formatter")).toBe(false);
  });
});

describe("validateTools: missing required fields", () => {
  const requiredFields = [
    "slug",
    "name",
    "shortDescription",
    "category",
    "seoTitle",
    "metaDescription",
  ] as const;

  it.each(requiredFields)(
    "throws when %s is absent, naming the field and the entry",
    (field) => {
      const tools = [without(field)];

      expect(() => validateTools(tools)).toThrow(ToolRegistryError);
      expect(() => validateTools(tools)).toThrow(
        new RegExp(`missing a required field: ${field}`),
      );
      // The message identifies which entry is at fault: by name, or by slug
      // when the name itself is what is missing.
      expect(() => validateTools(tools)).toThrow(
        field === "name" ? /example-tool/ : /Example Tool/,
      );
    },
  );

  it.each(requiredFields)(
    "throws when %s is an empty string, naming the field",
    (field) => {
      const tools = [validEntry({ [field]: "" } as Partial<ToolDefinition>)];

      expect(() => validateTools(tools)).toThrow(
        new RegExp(`missing a required field: ${field}`),
      );
    },
  );

  it.each(requiredFields)(
    "throws when %s is only whitespace, naming the field",
    (field) => {
      const tools = [validEntry({ [field]: "   " } as Partial<ToolDefinition>)];

      expect(() => validateTools(tools)).toThrow(
        new RegExp(`missing a required field: ${field}`),
      );
    },
  );

  it("identifies the entry by position when it has neither name nor slug", () => {
    const tools = [validEntry(), without("slug", { name: "" })];

    expect(() => validateTools(tools)).toThrow(/entry 2/);
  });
});

describe("validateTools: unknown category", () => {
  it("throws naming the entry and the bad category", () => {
    const tools = [
      validEntry({
        name: "Miscategorised Tool",
        category: "gadgets" as ToolDefinition["category"],
      }),
    ];

    expect(() => validateTools(tools)).toThrow(/Miscategorised Tool/);
    expect(() => validateTools(tools)).toThrow(/unknown category "gadgets"/);
  });

  it("lists the categories that are allowed", () => {
    const tools = [
      validEntry({ category: "gadgets" as ToolDefinition["category"] }),
    ];

    expect(() => validateTools(tools)).toThrow(/converters/);
    expect(() => validateTools(tools)).toThrow(/generators-formatters/);
  });

  it("honours a caller-supplied category list", () => {
    const entry = validEntry({ category: "converters" });

    expect(() =>
      validateTools(
        [entry],
        [
          {
            id: "generators-formatters",
            name: "Generators & formatters",
            description: "Only this one is allowed here.",
            order: 1,
          },
        ],
      ),
    ).toThrow(/unknown category "converters"/);
  });
});

describe("validateTools: reporting", () => {
  it("reports every problem at once, not just the first", () => {
    const tools = [
      validEntry({ slug: "Bad Slug", name: "First Bad Tool" }),
      validEntry({ name: "Second Bad Tool", seoTitle: "" }),
    ];

    let message = "";
    try {
      validateTools(tools);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("First Bad Tool");
    expect(message).toContain("Second Bad Tool");
    expect(message).toContain("2 problems");
  });

  it("uses the singular for one problem", () => {
    expect(() => validateTools([without("seoTitle")])).toThrow(/1 problem\)/);
  });
});
