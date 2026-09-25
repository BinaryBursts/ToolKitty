/**
 * The homepage's tool search (REQ-4).
 *
 * One rule, and deliberately only one: a tool matches when what the visitor
 * typed appears, as a substring, in the tool's name, its one-line description
 * or any of its keywords. No fuzzy matching, no ranking, no search index —
 * with fewer than ten tools in memory there is nothing an index would buy, and
 * a visitor typing "temp" wants the temperature converter rather than a
 * scored list.
 *
 * The filter is pure and knows nothing about React: it takes the tools it is
 * given and hands back the ones that match, in the order they arrived. The
 * search term itself is never stored, never put in the URL and never sent
 * anywhere — it lives in component state for as long as the page is open.
 */

/** The fields tool search reads. Anything carrying them can be filtered. */
export type SearchableTool = {
  readonly name: string;
  readonly shortDescription: string;
  readonly keywords: readonly string[];
};

/**
 * The form both sides of a comparison are folded to: surrounding whitespace
 * dropped and case removed, so " TEMP " and "temp" are the same search.
 */
export const normaliseQuery = (query: string): string =>
  query.trim().toLowerCase();

/** The text of a tool that search looks in: name, description, keywords. */
const searchableText = (tool: SearchableTool): readonly string[] => [
  tool.name,
  tool.shortDescription,
  ...tool.keywords,
];

/**
 * The tools matching `query`, in the order they were given.
 *
 * An empty query — or one that is nothing but whitespace — matches
 * everything, which is what makes the unfiltered page the natural resting
 * state: the visitor has not asked for anything, so nothing is hidden.
 */
export function filterTools<T extends SearchableTool>(
  tools: readonly T[],
  query: string,
): readonly T[] {
  const needle = normaliseQuery(query);

  if (needle === "") {
    return tools;
  }

  return tools.filter((tool) =>
    searchableText(tool).some((text) => text.toLowerCase().includes(needle)),
  );
}

export default filterTools;
