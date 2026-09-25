import Link from "next/link";

import { AdReserve } from "@/components/layout/AdReserve";
import { Container } from "@/components/layout/Container";
import { MoreTools } from "@/components/layout/MoreTools";
import { PrivacyNotice } from "@/components/layout/PrivacyNotice";
import { ToolErrorBoundary } from "@/components/layout/ToolErrorBoundary";
import { getCategoryById } from "@/tools/categories";
import type { ToolDefinition } from "@/tools/types";

/**
 * The order every tool page is laid out in, between the shared header and the
 * shared footer (REQ-2, and the approved tool screens).
 *
 * This is the specification, not a convenience: `ToolPageTemplate.test.tsx`
 * reads the rendered page's `data-section` attributes and asserts they come out
 * in exactly this order, so a section moved in the JSX fails the suite. Each
 * key is the `data-section` value of the section it names.
 *
 * **The privacy notice sits below the tool, not above it.** The approved
 * weight-converter screen draws the notice inside the intro block, above the
 * tool; REQ-2's acceptance criterion puts it after the tool, and that is the
 * order confirmed at review of this ticket. The design and the requirement
 * disagree on this one point — do not "correct" the template back to the
 * screen without reopening that decision.
 */
export const TOOL_PAGE_SECTIONS = [
  "intro",
  "tool",
  "privacy",
  "supporting-copy",
  "more-tools",
  "ad-reserve",
] as const;

/**
 * The one page template every tool is rendered by (REQ-2).
 *
 * A tool supplies a component and a registry entry; everything around it —
 * heading, description, privacy notice, supporting copy, the links on to the
 * other tools and the reserved ad space — is derived here from that entry. No
 * tool has a page file of its own, so no tool page can drift out of step with
 * the others or quietly ship without its privacy notice.
 */
export function ToolPageTemplate({ tool }: { tool: ToolDefinition }) {
  const Tool = tool.component;
  const category = getCategoryById(tool.category);

  return (
    <>
      <Container
        as="section"
        className="o-section o-stack"
        data-section="intro"
      >
        <nav className="o-row o-small o-muted" aria-label="Breadcrumb">
          <Link href="/">All tools</Link>
          {category ? (
            <>
              <span aria-hidden="true">›</span>
              <span>{category.name}</span>
            </>
          ) : null}
        </nav>
        <h1 className="o-display">{tool.name}</h1>
        <p className="o-lead">{tool.shortDescription}</p>
      </Container>

      <Container as="section" data-section="tool">
        <ToolErrorBoundary toolName={tool.name}>
          <Tool />
        </ToolErrorBoundary>
      </Container>

      <Container as="section" className="o-section" data-section="privacy">
        <PrivacyNotice />
      </Container>

      {tool.supportingCopy.length > 0 ? (
        <Container
          as="section"
          className="o-section o-stack t-copy"
          data-section="supporting-copy"
        >
          <h2 className="o-h2">About {tool.name}</h2>
          {tool.supportingCopy.map((paragraph) => (
            <p className="o-text" key={paragraph}>
              {paragraph}
            </p>
          ))}
        </Container>
      ) : null}

      <Container
        as="section"
        className="o-section o-stack"
        data-section="more-tools"
      >
        <MoreTools currentSlug={tool.slug} />
      </Container>

      <Container as="section" data-section="ad-reserve">
        <AdReserve />
      </Container>
    </>
  );
}

export default ToolPageTemplate;
