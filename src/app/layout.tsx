import type { Metadata } from "next";

import { Analytics } from "@/components/analytics/Analytics";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SITE_DESCRIPTION, SITE_NAME } from "@/config/site";

import { fontVariables } from "./fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  other: {
    // Both schemes are supported; the browser picks from the OS setting. This
    // makes user-agent chrome — form controls, scrollbars, the initial canvas
    // — follow it too, which is half of "no flash of the wrong scheme".
    "color-scheme": "light dark",
  },
};

/**
 * The single root layout every ToolKitty page sits inside: skip link, shared
 * header, main content area and shared footer.
 *
 * There is deliberately no theme script and no theme class here. Light and
 * dark come from the `prefers-color-scheme` media query in globals.css alone,
 * so the first paint is already correct and nothing has to be read from — or
 * written to — cookies, localStorage or sessionStorage (REQ-3).
 *
 * The one piece of state the shell does hold is the consent answer, and it
 * holds it the same way: in memory, for this browsing session only. The
 * provider wraps everything so every page — homepage, tool pages, /privacy,
 * /about and the 404 — is inside it, and the banner it renders sits after the
 * footer, outside `<main>`, so it is last in the tab order and covers nothing
 * (REQ-11).
 *
 * `<Analytics />` sits last of all, inside the same provider: it renders
 * nothing at all until that answer is `"accepted"`, so no analytics script is
 * in the exported HTML, none is in the DOM before Accept, and — being after
 * the content — it could not delay the first paint even once it is.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <ConsentProvider>
          <a className="o-skip" href="#content">
            Skip to content
          </a>
          <SiteHeader />
          <main className="o-main" id="content">
            {children}
          </main>
          <SiteFooter />
          <ConsentBanner />
          <Analytics />
        </ConsentProvider>
      </body>
    </html>
  );
}
