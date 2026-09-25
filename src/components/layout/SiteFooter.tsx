import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { SITE_NAME } from "@/config/site";

/** The shell's footer navigation, in the order the design draws it. */
export const FOOTER_NAV = [
  { href: "/", label: "All tools" },
  { href: "/about", label: "About & contact" },
  { href: "/privacy", label: "Privacy policy" },
] as const;

/**
 * The footer every ToolKitty page shares: the wordmark, the promise that the
 * site keeps nothing, and links to the About/contact and privacy pages.
 */
export function SiteFooter() {
  return (
    <footer className="o-footer">
      <Container as="div" className="o-stack">
        <div className="o-spread" style={{ alignItems: "flex-start" }}>
          <div className="o-stack--tight">
            <Link className="o-brand" href="/">
              <span className="o-brand__mark" aria-hidden="true">
                T
              </span>
              <span>{SITE_NAME}</span>
            </Link>
            <p
              className="o-small o-muted"
              style={{ margin: 0, maxWidth: "42ch" }}
            >
              Small, fast tools that run entirely in your browser. Nothing you
              type ever leaves this device, and nothing is remembered between
              visits.
            </p>
          </div>
          <nav className="o-nav o-nav--row" aria-label="Footer">
            {FOOTER_NAV.map((item) => (
              <Link className="o-nav__item" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <hr className="o-divider" />

        <p className="o-small o-muted" style={{ margin: 0 }}>
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </Container>
    </footer>
  );
}

export default SiteFooter;
