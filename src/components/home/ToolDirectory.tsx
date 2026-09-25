import { Container } from "@/components/layout/Container";
import { getToolsByCategory } from "@/tools/registry";
import type { CategoryId, ToolsByCategory } from "@/tools/types";

import { ToolCard } from "./ToolCard";

export type ToolDirectoryProps = {
  /**
   * The categories to list, each with its tools. Defaults to the registry,
   * grouped: categories in their defined order, tools in registry order.
   */
  groups?: readonly ToolsByCategory[];
};

/** Anchor for the directory as a whole. */
export const DIRECTORY_ID = "all-tools";

/** Anchor for one category's section, used by the "browse by category" links. */
export const categorySectionId = (category: CategoryId): string =>
  `category-${category}`;

const toolCountLabel = (count: number): string =>
  `${count} ${count === 1 ? "tool" : "tools"}`;

/**
 * Every tool on the site, grouped under its category heading (REQ-4).
 *
 * A category with no tools is not rendered — not its heading, not its
 * description, not an empty grid. The registry's own grouping already drops
 * them, and the guard here means the same holds for any other set of groups
 * this is handed (a search result, in TKT-9).
 *
 * The whole listing is in the statically rendered HTML: no data is fetched and
 * nothing is hidden behind script, so a crawler and a visitor with JavaScript
 * disabled both see every tool and every link.
 */
export function ToolDirectory({
  groups = getToolsByCategory(),
}: ToolDirectoryProps) {
  const populated = groups.filter((group) => group.tools.length > 0);
  const total = populated.reduce((count, group) => count + group.tools.length, 0);

  return (
    <Container as="section" className="o-section" aria-labelledby={DIRECTORY_ID}>
      <div className="o-stack">
        <div className="o-spread">
          <h2 className="o-h2" id={DIRECTORY_ID}>
            All tools
          </h2>
          <span className="o-small o-muted">{toolCountLabel(total)}</span>
        </div>

        {populated.map(({ category, tools }) => (
          <div className="o-stack--tight" key={category.id}>
            <div className="o-row" style={{ alignItems: "baseline" }}>
              <h3 className="o-h3" id={categorySectionId(category.id)}>
                {category.name}
              </h3>
              <span className="o-badge">{toolCountLabel(tools.length)}</span>
            </div>
            <p className="o-small o-muted" style={{ margin: 0 }}>
              {category.description}
            </p>
            <div className="o-grid o-grid--2" style={{ marginTop: 10 }}>
              {tools.map((tool) => (
                <ToolCard
                  key={tool.slug}
                  tool={tool}
                  layout="row"
                  headingLevel={4}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}

export default ToolDirectory;
