import type { Metadata } from "next";
import Link from "next/link";

import { ToolCard } from "@/components/home/ToolCard";
import { Container } from "@/components/layout/Container";
import { SITE_NAME } from "@/config/site";
import { toolPath } from "@/lib/urls";
import { getToolListings } from "@/tools/registry";

/**
 * The 404 page's own metadata.
 *
 * `title.absolute` because the root layout carries a `%s · ToolKitty`
 * template and this title already ends in the site name. `robots` states
 * `noindex` explicitly: the static export has no server to set a 404 status
 * header, so the meta tag is the only thing telling a crawler not to index
 * this page (and `follow` is kept, so the links on to the real tool pages are
 * still worth something).
 */
export const metadata: Metadata = {
  title: { absolute: `Page not found — ${SITE_NAME}` },
  description:
    "That address does not exist on ToolKitty. Every tool has a permanent address — here is the full list.",
  robots: { index: false, follow: true },
};

/** The arrow the approved screen draws inside the primary button. */
function ArrowIcon() {
  return (
    <svg
      className="o-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h13m0 0-4.5-4.5M18 12l-4.5 4.5" />
    </svg>
  );
}

/** The padlock beside the privacy line, drawn as the site draws it elsewhere. */
function LockIcon() {
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
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * The "404" mark the approved screen draws beside the message. Decorative
 * only: it is `aria-hidden`, and every colour comes from a theme variable —
 * `--t-notfound-ink` is swapped by the dark scheme — so it follows the
 * system's colour scheme with the rest of the page and sets no colour of its
 * own here.
 */
function NotFoundMark() {
  return (
    <div aria-hidden="true" className="t-notfound__art">
      <svg viewBox="0 0 260 200" role="presentation" focusable="false">
        <defs>
          <linearGradient id="tk-404" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor="var(--t-notfound-ink)"
              stopOpacity=".92"
            />
            <stop
              offset="1"
              stopColor="var(--t-notfound-ink)"
              stopOpacity=".55"
            />
          </linearGradient>
        </defs>
        <circle
          cx="130"
          cy="100"
          r="92"
          fill="var(--t-notfound-ink)"
          opacity=".12"
        />
        <circle cx="196" cy="46" r="14" fill="var(--o-accent)" opacity=".55" />
        <circle cx="48" cy="156" r="9" fill="var(--o-accent)" opacity=".4" />
        <text
          x="130"
          y="131"
          textAnchor="middle"
          fontSize="96"
          fontWeight="600"
          letterSpacing="-4"
          fill="url(#tk-404)"
        >
          404
        </text>
        <path
          d="M34 168 C 92 190, 168 190, 226 168"
          fill="none"
          stroke="var(--t-notfound-ink)"
          strokeOpacity=".35"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * The site's not-found page (REQ-2, and the approved "Page not found" screen).
 *
 * This one file answers every unknown address: the static export writes it to
 * `out/404.html`, which the host serves for any path with no file behind it,
 * and it is also the boundary `notFound()` renders into — so an unknown
 * `/tools/<slug>` lands here rather than on a stock error page.
 *
 * The page deliberately does not name the address that was missed. There is no
 * server to tell it what was requested, and reading the path in the browser
 * would leave the pre-rendered HTML — the version a crawler and a visitor with
 * JavaScript off see — saying nothing at all.
 *
 * The way out is taken from the registry (REQ-2): every registered tool is
 * listed, so a fifth tool appears here the moment its entry lands and a visitor
 * who mistyped a slug can see the one they meant.
 */
export default function NotFound() {
  const tools = getToolListings();

  return (
    <>
      <Container as="section" className="o-section">
        <div className="t-device">
          <div
            className="o-grid o-grid--sidebar"
            style={{ alignItems: "center" }}
          >
            <div className="o-stack">
              <span className="o-eyebrow">Error 404 · Page not found</span>
              <h1 className="o-display" style={{ margin: 0 }}>
                That page does not exist
              </h1>
              <p className="o-lead" style={{ margin: 0 }}>
                We looked for that address and found nothing. It may be
                mistyped, or it may be a tool we have not built yet. Every{" "}
                {SITE_NAME} tool lives at a permanent address under{" "}
                <span className="o-mono o-strong">/tools/</span>, so a link that
                worked before still works — nothing is ever moved or retired.
              </p>
              <div className="o-row" style={{ gap: 10 }}>
                <Link className="o-btn o-btn--primary o-btn--lg" href="/">
                  Back to all tools <ArrowIcon />
                </Link>
                <Link
                  className="o-btn o-btn--secondary o-btn--lg"
                  href="/about"
                >
                  Suggest a tool
                </Link>
              </div>
              <div className="t-privacy">
                <LockIcon />
                <p className="o-text" style={{ margin: 0 }}>
                  <span className="o-strong">Nothing was recorded.</span>{" "}
                  {SITE_NAME} keeps no cookies of its own and remembers no page
                  you visited — not even a wrong one.{" "}
                  <Link href="/privacy">Read the privacy policy</Link>
                </p>
              </div>
            </div>

            <NotFoundMark />
          </div>
        </div>
      </Container>

      <Container as="section" className="o-section">
        <div className="o-grid o-grid--sidebar">
          <div className="o-stack">
            <h2 className="o-h2" style={{ margin: 0 }}>
              Try one of the tools
            </h2>
            <p
              className="o-text o-muted"
              style={{ margin: 0, maxWidth: "60ch" }}
            >
              Every tool runs entirely on your device and opens in a clean
              state.
            </p>
            <div className="o-grid o-grid--2">
              {tools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} layout="row" />
              ))}
            </div>
          </div>

          <aside className="o-card o-stack">
            <div className="o-card__header">Find the one you wanted</div>
            <p className="o-small o-muted" style={{ margin: 0 }}>
              The homepage lists every tool and searches their names,
              descriptions and keywords — the same tools listed here.
            </p>
            <Link className="o-btn o-btn--secondary o-btn--block" href="/">
              Search all tools
            </Link>
            <hr className="o-divider" />
            <div className="o-stack--tight">
              <span className="o-small o-muted">Jump straight to a tool</span>
              <div className="o-row">
                {tools.map((tool) => (
                  <Link
                    className="o-chip"
                    href={toolPath(tool.slug)}
                    key={tool.slug}
                  >
                    {tool.name}
                  </Link>
                ))}
              </div>
            </div>
            <hr className="o-divider" />
            <p className="o-small o-muted" style={{ margin: 0 }}>
              Still stuck?{" "}
              <Link href="/about">Tell us what you were looking for</Link> — we
              add a tool or two at a time.
            </p>
          </aside>
        </div>
      </Container>
    </>
  );
}
