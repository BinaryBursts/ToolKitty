import type { Metadata } from "next";
import Link from "next/link";

import { FeaturedTools } from "@/components/home/FeaturedTools";
import { Hero } from "@/components/home/Hero";
import {
  categorySectionId,
  DIRECTORY_ID,
} from "@/components/home/directoryAnchors";
import { ToolDirectory } from "@/components/home/ToolDirectory";
import { Container } from "@/components/layout/Container";
import { SITE_BASE_URL, SITE_DESCRIPTION, SITE_NAME } from "@/config/site";
import { getCategoriesInOrder } from "@/tools/categories";
import { getToolListings } from "@/tools/registry";

/**
 * The homepage's own metadata.
 *
 * `title.absolute` because the root layout carries a `%s · ToolKitty`
 * template and this title already ends in the site name. The description is
 * the site's one-liner rather than anything built from the registry, so
 * adding a tool never silently rewrites the homepage's search snippet.
 */
export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — fast, private browser tools`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: `${SITE_BASE_URL}/`,
  },
};

/**
 * The tool directory (REQ-4): a short hero saying what ToolKitty is, the
 * featured row, then every tool as a card under its category heading, in the
 * order the approved directory screen draws them.
 *
 * Nothing here fetches: the whole listing is rendered into `out/index.html` at
 * build time, which is what makes it visible to a crawler and to a visitor
 * with JavaScript switched off. The directory is a client component only
 * because it filters as the visitor types, and it starts with an empty query,
 * so the pre-rendered HTML holds every tool either way — search narrows what
 * is already on the page.
 *
 * The featured row is handed to the directory rather than rendered here, so
 * that an active search can take it off screen and leave the filtered listing
 * as the only set of tools in view. It is still rendered on the server: only
 * the decision to show it is made in the browser.
 *
 * The registry import is also what makes a bad registry entry fail
 * `npm run build` — `validateTools` runs when the registry module is first
 * imported (REQ-2), and this page is one of the things that imports it.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <ToolDirectory tools={getToolListings()} featured={<FeaturedTools />} />

      <Container as="section" className="o-section">
        <div className="o-grid o-grid--sidebar">
          <div className="o-stack t-copy">
            <h2 className="o-h2">What {SITE_NAME} is</h2>
            <p className="o-text">
              {SITE_NAME} is a small collection of everyday utilities that do
              their work in the page you are looking at. When you convert 68 kg
              to pounds or paste in a block of JSON, the calculation happens in
              your browser — there is no server to send it to.
            </p>
            <p className="o-text">
              There are no accounts, no saved history and no preferences to
              manage. Close the tab and the site forgets you completely: no
              stored units, no recent conversions, not even a theme choice —
              the page simply follows the light or dark setting your system
              already uses.
            </p>
            <div className="t-privacy">
              <p className="o-text" style={{ margin: 0 }}>
                <span className="o-strong">
                  Nothing you type ever leaves your browser.
                </span>{" "}
                Every tool runs on your device.{" "}
                <Link href="/privacy">Read the privacy policy</Link>
              </p>
            </div>
          </div>

          <aside className="o-card o-stack">
            <div className="o-card__header">Browse by category</div>
            <div className="o-row">
              <a className="o-chip" href={`#${DIRECTORY_ID}`}>
                All
              </a>
              {getCategoriesInOrder().map((category) => (
                <a
                  className="o-chip"
                  href={`#${categorySectionId(category.id)}`}
                  key={category.id}
                >
                  {category.name}
                </a>
              ))}
            </div>
            <hr className="o-divider" />
            <p className="o-small o-muted" style={{ margin: 0 }}>
              More tools are on the way. Every one gets a permanent address
              under <span className="o-mono">/tools/</span> that never changes.
            </p>
            <Link className="o-btn o-btn--secondary o-btn--sm" href="/about">
              Suggest a tool
            </Link>
          </aside>
        </div>
      </Container>
    </>
  );
}
