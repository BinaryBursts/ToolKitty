import Link from "next/link";
import type { SVGProps } from "react";

import { cx } from "@/lib/classNames";
import type { CategoryId, ToolDefinition } from "@/tools/types";

/**
 * How a card is drawn: `stacked` is the featured row's card (tile above the
 * name), `row` is the directory's wider card (tile beside the text).
 */
export type ToolCardLayout = "stacked" | "row";

export type ToolCardProps = {
  tool: ToolDefinition;
  /** Which of the two shapes the approved directory screen draws. */
  layout?: ToolCardLayout;
  /**
   * Heading level for the tool name, so the card fits the outline of the
   * section it sits in: 3 under the featured section's `<h2>`, 4 under a
   * category's `<h3>`.
   */
  headingLevel?: 3 | 4;
};

/**
 * The icon tile's colour comes from the tool's category, not from the tool:
 * a new registry entry then lands in the directory looking like its
 * neighbours without anyone choosing a colour for it (REQ-2).
 */
const CATEGORY_TILE_CLASS: Record<CategoryId, string | null> = {
  converters: null, // the tile's own mint
  "generators-formatters": "t-tool__ico--sky",
};

/** The path a tool is published at. Slugs are permanent (REQ-2). */
export const toolHref = (tool: ToolDefinition): string =>
  `/tools/${tool.slug}`;

function TileIcon({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="o-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/**
 * One glyph per category, for the same reason as the tile colour. Both are
 * `aria-hidden`: the card's accessible name is the tool's name, and an icon
 * that repeated it would only be read out twice.
 */
function CategoryIcon({ category }: { category: CategoryId }) {
  if (category === "converters") {
    // Two arrows passing each other: one unit into another.
    return (
      <TileIcon>
        <path d="M4 8h13m0 0-3.5-3.5M17 8l-3.5 3.5" />
        <path d="M20 16H7m0 0 3.5-3.5M7 16l3.5 3.5" />
      </TileIcon>
    );
  }

  // A page with tidy lines: something made, or something tidied up.
  return (
    <TileIcon>
      <path d="M6 3.5h7L18.5 9v11.5h-12z" />
      <path d="M13 3.5V9h5.5" />
      <path d="M9 13h6M9 16.5h4" />
    </TileIcon>
  );
}

/**
 * A tool as the homepage directory lists it: the category's icon tile, the
 * tool's name and its one-line description, with the whole card a link to
 * `/tools/<slug>`.
 *
 * Everything is a plain anchor in the rendered HTML, so the card works with
 * JavaScript disabled and a crawler following links finds every tool page
 * from the homepage (REQ-4).
 */
export function ToolCard({
  tool,
  layout = "stacked",
  headingLevel = 3,
}: ToolCardProps) {
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const tile = cx("t-tool__ico", CATEGORY_TILE_CLASS[tool.category]);
  const href = toolHref(tool);

  if (layout === "row") {
    return (
      <Link className="t-tool t-tool--row" href={href}>
        <span className={tile}>
          <CategoryIcon category={tool.category} />
        </span>
        <div className="t-tool__body o-stack--tight">
          <Heading className="o-h3" style={{ margin: 0 }}>
            {tool.name}
          </Heading>
          <p className="o-small o-muted" style={{ margin: 0 }}>
            {tool.shortDescription}
          </p>
          <span className="o-small o-mono o-muted t-tool__path">{href}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link className="t-tool" href={href}>
      <span className={tile}>
        <CategoryIcon category={tool.category} />
      </span>
      <Heading className="o-h3">{tool.name}</Heading>
      <p className="o-small o-muted" style={{ margin: "6px 0 10px" }}>
        {tool.shortDescription}
      </p>
      <span className="o-small t-tool__open">
        Open
        <TileIcon width="16" height="16">
          <path d="M5 12h13m0 0-4.5-4.5M18 12l-4.5 4.5" />
        </TileIcon>
      </span>
    </Link>
  );
}

export default ToolCard;
