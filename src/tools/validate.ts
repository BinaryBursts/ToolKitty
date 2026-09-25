import { TOOL_CATEGORIES } from "./categories";
import { type ToolCategory, type ToolDefinition } from "./types";

/**
 * Registry validation (REQ-2).
 *
 * `registry.ts` calls {@link validateTools} at module load, so a registry that
 * breaks one of these rules fails `npm run build` rather than shipping a broken
 * page. TypeScript already catches most mistakes; this catches the ones it
 * cannot — a duplicate slug, a slug that is not URL-safe, and a required field
 * left as an empty string.
 */

/** Lower-case words joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Fields every entry must supply as a non-empty string. */
const REQUIRED_FIELDS = [
  "slug",
  "name",
  "shortDescription",
  "category",
  "seoTitle",
  "metaDescription",
] as const satisfies readonly (keyof ToolDefinition)[];

/** Thrown when the registry is invalid. */
export class ToolRegistryError extends Error {
  constructor(problems: readonly string[]) {
    super(
      [
        `Invalid tool registry (${problems.length} problem${
          problems.length === 1 ? "" : "s"
        }):`,
        ...problems.map((problem) => `  - ${problem}`),
      ].join("\n"),
    );
    this.name = "ToolRegistryError";
  }
}

/**
 * How an entry is named in an error message. Uses the display name and the slug
 * when they are there, so the message always points at one entry even when the
 * missing field is the name or the slug itself.
 */
const describeEntry = (entry: ToolDefinition, index: number): string => {
  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";

  if (name && slug) return `"${name}" (slug "${slug}")`;
  if (name) return `"${name}" (entry ${index + 1}, no slug)`;
  if (slug) return `slug "${slug}" (entry ${index + 1}, no name)`;
  return `entry ${index + 1} (no name, no slug)`;
};

const isNonEmptyString = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

/**
 * Check the registry and throw a {@link ToolRegistryError} naming every
 * offending entry, or return silently when it is sound.
 *
 * Every problem is collected before throwing, so one build failure reports all
 * of them instead of only the first.
 */
export const validateTools = (
  tools: readonly ToolDefinition[],
  categories: readonly ToolCategory[] = TOOL_CATEGORIES,
): void => {
  const problems: string[] = [];
  const knownCategoryIds = new Set(categories.map((category) => category.id));
  const slugFirstSeenAt = new Map<string, number>();

  tools.forEach((entry, index) => {
    const where = describeEntry(entry, index);

    for (const field of REQUIRED_FIELDS) {
      if (!isNonEmptyString(entry[field])) {
        problems.push(`${where} is missing a required field: ${field}.`);
      }
    }

    if (isNonEmptyString(entry.slug)) {
      const slug = entry.slug.trim();

      if (!SLUG_PATTERN.test(slug)) {
        problems.push(
          `${where} has an invalid slug "${entry.slug}": a slug must be ` +
            `lower-case words joined by single hyphens (${String(SLUG_PATTERN)}).`,
        );
      }

      const firstSeenAt = slugFirstSeenAt.get(slug);
      if (firstSeenAt === undefined) {
        slugFirstSeenAt.set(slug, index);
      } else {
        problems.push(
          `${where} repeats the slug "${slug}", already used by entry ` +
            `${firstSeenAt + 1}. Tool slugs must be unique: they are the ` +
            `permanent URL of the tool.`,
        );
      }
    }

    if (
      isNonEmptyString(entry.category) &&
      !knownCategoryIds.has(entry.category)
    ) {
      problems.push(
        `${where} has an unknown category "${entry.category}". Known ` +
          `categories: ${categories.map((c) => c.id).join(", ")}.`,
      );
    }
  });

  if (problems.length > 0) {
    throw new ToolRegistryError(problems);
  }
};
