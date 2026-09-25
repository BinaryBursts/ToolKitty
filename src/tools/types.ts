import type { ComponentType } from "react";

/**
 * Types for the tool registry — the single source of truth for every tool on
 * the site (REQ-2).
 *
 * Navigation, the homepage directory, tool search, the sitemap, page metadata,
 * the privacy notice and the ad slot are all derived from registry entries, so
 * adding a tool is one component file plus one entry in
 * {@link file://./registry.ts} and nothing else.
 */

/**
 * The categories the directory groups tools by. The union is the type; the
 * display names, order and descriptions live in {@link file://./categories.ts}.
 */
export type CategoryId = "converters" | "generators-formatters";

/** A category as the directory renders it. */
export interface ToolCategory {
  /** Stable identifier used by registry entries. */
  readonly id: CategoryId;
  /** Display name, used as the directory section heading. */
  readonly name: string;
  /** One line under the heading, saying what the category is for. */
  readonly description: string;
  /** Ascending sort order for directory sections. Lower comes first. */
  readonly order: number;
}

/**
 * A tool component renders the tool itself, inside the shared page template.
 *
 * `ComponentType` with no props is deliberate: a tool must not require props
 * from outside the registry (REQ-2), so a component with a required prop will
 * not type-check as a registry entry.
 *
 * **A tool that sends what the visitor types anywhere may not be registered.**
 * Every tool page carries the privacy notice
 * ({@link file://../components/layout/PrivacyNotice.tsx}), rendered by the
 * shared template with no way for a tool to switch it off, and it states
 * plainly that the input never leaves the browser. A tool that needs a network
 * request — an API lookup, a file upload, a server-side conversion — makes
 * that notice untrue on its page, so the notice has to be changed first and
 * the claim re-agreed; only then can such a tool go into the registry
 * (REQ-9).
 */
export type ToolComponent = ComponentType;

/** One tool, as the registry holds it. */
export interface ToolDefinition {
  /**
   * URL segment for the tool: the page is served at `/tools/<slug>`.
   *
   * Lower-case words joined by single hyphens, unique across the registry.
   * **A published slug is permanent** — it is never renamed or removed. If a
   * tool needs a new name, change {@link ToolDefinition.name} and leave the
   * slug alone (REQ-2). `published-slugs.lock.json` holds the ones already
   * published and a test fails if one of them disappears.
   */
  readonly slug: string;
  /** Display name, used as the page heading, card title and nav label. */
  readonly name: string;
  /** One sentence for the directory card, search results and nav. */
  readonly shortDescription: string;
  /** Which directory section the tool belongs to. */
  readonly category: CategoryId;
  /** Extra words tool search matches on, beyond the name and description. */
  readonly keywords: readonly string[];
  /**
   * The **complete** `<title>` of the tool page, used verbatim.
   *
   * It already ends with the site name — "Weight Converter — kg, lb, oz, g and
   * stones | ToolKitty" — so the page template must render it as it is and must
   * **not** append the site name again, and must not set a Next.js
   * `title.template` that would wrap it. Confirmed at review of this ticket.
   * `registry.test.ts` fails if an entry stops carrying the site name.
   */
  readonly seoTitle: string;
  /** The page's meta description. */
  readonly metaDescription: string;
  /** True when the tool is promoted in the homepage's featured row. */
  readonly featured: boolean;
  /** The component that renders the tool. */
  readonly component: ToolComponent;
  /**
   * Prose the page template renders below the tool: what it does, how to use
   * it, and anything worth knowing. One entry per paragraph.
   */
  readonly supportingCopy: readonly string[];
}

/**
 * A tool as the homepage directory and its search need it: everything the
 * cards show and the filter reads, and nothing else.
 *
 * It exists because the directory filters as the visitor types, which makes it
 * a client component, and {@link ToolDefinition.component} is a function — it
 * cannot cross the server-to-client boundary. The page hands the client the
 * listing instead, which is plain data, and the tool components stay out of
 * the homepage's JavaScript bundle (REQ-4).
 */
export type ToolListing = Pick<
  ToolDefinition,
  "slug" | "name" | "shortDescription" | "category" | "keywords" | "featured"
>;

/** A category together with the tools in it, for the directory. */
export interface CategoryGroup<T> {
  readonly category: ToolCategory;
  readonly tools: readonly T[];
}

/** A category together with its registry entries. */
export type ToolsByCategory = CategoryGroup<ToolDefinition>;

/** A category together with its listings, as the directory renders them. */
export type ToolListingsByCategory = CategoryGroup<ToolListing>;
