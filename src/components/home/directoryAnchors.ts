import type { CategoryId } from "@/tools/types";

/**
 * The homepage directory's anchors, in a module of their own.
 *
 * They are shared by the directory (a client component, because it filters as
 * the visitor types) and by the page's "browse by category" links, which are
 * rendered on the server: a value exported from a `"use client"` module cannot
 * be called from the server, so the ids live here where both sides can reach
 * them.
 */

/** Anchor for the directory as a whole. */
export const DIRECTORY_ID = "all-tools";

/** Anchor for one category's section, used by the "browse by category" links. */
export const categorySectionId = (category: CategoryId): string =>
  `category-${category}`;
