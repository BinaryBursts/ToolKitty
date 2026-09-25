import Link from "next/link";

import { toolPath } from "@/lib/urls";
import { getAllTools } from "@/tools/registry";

/**
 * The route onward from a tool page: every other registered tool, as a card
 * with its name and what it does.
 *
 * The list comes from the registry (REQ-2), so a new tool appears at the foot
 * of every existing tool page the moment its entry lands — there is no
 * hand-written list of related tools anywhere, and none to forget to update.
 * The tool being read is left out of its own list.
 */
export function MoreTools({ currentSlug }: { currentSlug?: string }) {
  const others = getAllTools().filter((tool) => tool.slug !== currentSlug);

  if (others.length === 0) return null;

  return (
    <>
      <div className="o-spread">
        <h2 className="o-h2">More tools</h2>
        <Link className="o-btn o-btn--secondary o-btn--sm" href="/">
          Browse all tools
        </Link>
      </div>
      <div className="o-grid o-grid--3">
        {others.map((tool) => (
          <Link className="t-tool" href={toolPath(tool.slug)} key={tool.slug}>
            <h3 className="o-h3">{tool.name}</h3>
            <p className="o-small o-muted" style={{ margin: "6px 0 0" }}>
              {tool.shortDescription}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

export default MoreTools;
