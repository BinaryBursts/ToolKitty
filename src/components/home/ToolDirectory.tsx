"use client";

import { useState, type ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui";
import { filterTools } from "@/lib/searchTools";
import { groupByCategory } from "@/tools/categories";
import type { CategoryId, ToolListing } from "@/tools/types";

import { ToolCard } from "./ToolCard";
import { ToolSearch } from "./ToolSearch";

export type ToolDirectoryProps = {
  /**
   * Every tool on the site, in registry order, as plain data. The page reads
   * the registry and passes it in: the listing is rendered into the static
   * HTML before any script runs, and search only filters what is there.
   */
  tools: readonly ToolListing[];
  /**
   * The featured row. It is rendered here rather than by the page so that a
   * search can take it off screen — while the visitor is filtering, the
   * filtered listing should be the only set of tools they are looking at.
   */
  featured?: ReactNode;
};

/** Anchor for the directory as a whole. */
export const DIRECTORY_ID = "all-tools";

/** Anchor for one category's section, used by the "browse by category" links. */
export const categorySectionId = (category: CategoryId): string =>
  `category-${category}`;

/** The message shown in place of the listing when nothing matches. */
export const NO_RESULTS_MESSAGE = "No tools match that search.";

const toolCountLabel = (count: number): string =>
  `${count} ${count === 1 ? "tool" : "tools"}`;

/** What the live region says, both while searching and at rest. */
const resultSummary = (matched: number, searching: boolean): string => {
  if (!searching) {
    return toolCountLabel(matched);
  }
  if (matched === 0) {
    return "No tools match";
  }
  return matched === 1 ? "1 tool matches" : `${matched} tools match`;
};

/**
 * Every tool on the site, grouped under its category heading, with the search
 * box that filters it (REQ-4).
 *
 * A client component, because the filtering happens as the visitor types — but
 * one that starts from an empty query, so what Next renders at build time is
 * the complete listing: a crawler and a visitor with JavaScript switched off
 * both see every tool, every description and every link. Search narrows what
 * is already on the page; it never fetches.
 *
 * The query lives in this component's state and nowhere else. It is not put in
 * the URL, not written to storage and not sent anywhere, so it exists for
 * exactly as long as the page is open.
 *
 * A category with no tools is not rendered — not its heading, not its
 * description, not an empty grid — which is as true of a search that matches
 * one converter as it is of the unfiltered registry.
 */
export function ToolDirectory({ tools, featured }: ToolDirectoryProps) {
  const [query, setQuery] = useState("");

  const searching = query.trim() !== "";
  const matches = filterTools(tools, query);
  const groups = groupByCategory(matches);

  return (
    <>
      <Container as="section" className="t-searchband" aria-label="Tool search">
        <ToolSearch value={query} onChange={setQuery} />
      </Container>

      {searching ? null : featured}

      <Container
        as="section"
        className="o-section"
        aria-labelledby={DIRECTORY_ID}
      >
        <div className="o-stack">
          <div className="o-spread">
            <h2 className="o-h2" id={DIRECTORY_ID}>
              All tools
            </h2>
            {/* The count is the live region: one element that both shows and
                announces how many tools are left as the query changes. */}
            <span
              className="o-small o-muted"
              role="status"
              aria-live="polite"
            >
              {resultSummary(matches.length, searching)}
            </span>
          </div>

          {groups.length === 0 ? (
            <div className="o-empty o-stack--tight">
              <p className="o-text" style={{ margin: 0 }}>
                {NO_RESULTS_MESSAGE}
              </p>
              <div>
                <Button size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </div>
            </div>
          ) : (
            groups.map(({ category, tools: categoryTools }) => (
              <div className="o-stack--tight" key={category.id}>
                <div className="o-row" style={{ alignItems: "baseline" }}>
                  <h3 className="o-h3" id={categorySectionId(category.id)}>
                    {category.name}
                  </h3>
                  <span className="o-badge">
                    {toolCountLabel(categoryTools.length)}
                  </span>
                </div>
                <p className="o-small o-muted" style={{ margin: 0 }}>
                  {category.description}
                </p>
                <div className="o-grid o-grid--2" style={{ marginTop: 10 }}>
                  {categoryTools.map((tool) => (
                    <ToolCard
                      key={tool.slug}
                      tool={tool}
                      layout="row"
                      headingLevel={4}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Container>
    </>
  );
}

export default ToolDirectory;
