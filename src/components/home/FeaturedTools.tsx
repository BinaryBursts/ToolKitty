import { Container } from "@/components/layout/Container";
import { getFeaturedTools } from "@/tools/registry";
import type { ToolDefinition } from "@/tools/types";

import { ToolCard } from "./ToolCard";

export type FeaturedToolsProps = {
  /**
   * The tools to promote. Defaults to the registry entries carrying the
   * `featured` flag, in registry order — the flag is the only thing that
   * decides this, so promoting a tool is one boolean in the registry (REQ-4).
   */
  tools?: readonly ToolDefinition[];
};

/** Heading id, so the section is announced by its own heading. */
const HEADING_ID = "featured-tools";

/**
 * The hand-picked row under the hero: a short way in for a visitor who has no
 * particular tool in mind. Nothing is filtered or sorted here — whatever the
 * registry flags, in the order the registry holds it.
 */
export function FeaturedTools({
  tools = getFeaturedTools(),
}: FeaturedToolsProps) {
  if (tools.length === 0) {
    return null;
  }

  return (
    <Container as="section" aria-labelledby={HEADING_ID}>
      <div className="o-spread" style={{ marginBottom: 14 }}>
        <div className="o-stack--tight">
          <span className="o-eyebrow">Featured</span>
          <h2 className="o-h2" id={HEADING_ID}>
            Start here
          </h2>
        </div>
        <span className="o-badge o-badge--primary o-hide-mobile">
          Free, with no sign-up
        </span>
      </div>

      <div className="o-grid o-grid--4">
        {tools.map((tool) => (
          <ToolCard key={tool.slug} tool={tool} />
        ))}
      </div>
    </Container>
  );
}

export default FeaturedTools;
