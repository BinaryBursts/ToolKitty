import Link from "next/link";

import { SITE_NAME } from "@/config/site";

/** The shell's primary navigation, in the order the design draws it. */
export const PRIMARY_NAV = [
  { href: "/", label: "Tools" },
  { href: "/about", label: "About" },
] as const;

function MenuIcon() {
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
      aria-hidden="true"
      focusable="false"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

/**
 * The header every ToolKitty page shares: the wordmark linking home, and the
 * primary navigation.
 *
 * Below 640 px the navigation collapses into a compact menu. That menu is a
 * native `<details>` disclosure on purpose — it opens and closes from the
 * keyboard with no JavaScript, and, like the rest of the site, it writes
 * nothing to any browser store (REQ-3). Only one of the two navigations is in
 * the accessibility tree at a time; the other is `display: none`.
 */
export function SiteHeader() {
  return (
    <header className="o-topbar">
      <Link className="o-brand" href="/">
        <span className="o-brand__mark" aria-hidden="true">
          T
        </span>
        <span>{SITE_NAME}</span>
      </Link>

      <div className="o-grow" />

      <nav className="o-nav o-nav--row o-hide-mobile" aria-label="Main">
        {PRIMARY_NAV.map((item) => (
          <Link className="o-nav__item" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <details className="o-menu o-show-mobile">
        <summary className="o-menu__toggle" aria-label="Menu">
          <MenuIcon />
        </summary>
        <nav className="o-nav o-nav--row o-menu__panel" aria-label="Main">
          {PRIMARY_NAV.map((item) => (
            <Link className="o-nav__item" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </details>
    </header>
  );
}

export default SiteHeader;
