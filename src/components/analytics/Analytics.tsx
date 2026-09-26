"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

import { useConsent } from "@/components/consent/ConsentProvider";
import { GA_MEASUREMENT_ID, isAnalyticsEnabled } from "@/config/site";

/**
 * Google Analytics 4, and nothing else (REQ-11).
 *
 * **Page views are the only event this module is permitted to send.** No
 * custom event, no conversion, no audience signal, and above all nothing
 * derived from what a visitor typed: not a generated password, not a pasted
 * JSON document, not a weight, not a temperature, not a homepage search term.
 * The only two parameters that ever leave this file are the page's path and
 * its title, both of which are already in the URL bar and the tab strip. The
 * types below say so — {@link Gtag} accepts one event name and one parameter
 * shape — and `page-views-only.test.ts` says so again by scanning the source,
 * because a future "just one custom event" is exactly how this rule gets lost.
 *
 * Nothing here runs, and no request to a Google host is made, until the
 * visitor presses Accept on the consent banner: the component returns `null`
 * while the answer is `"unanswered"` or `"declined"`, so the script tags are
 * not in the DOM and — because the component renders nothing on the server
 * either — not in the exported HTML at all. Google Consent Mode's cookieless
 * pings are deliberately not used: REQ-11 asks for no request before Accept,
 * not a quieter one.
 *
 * It is also allowed to fail. If the visitor's ad-blocker, network or Google
 * itself stops gtag.js loading, the load error is swallowed, nothing is
 * retried, no fallback is attempted and no message is shown; every page and
 * every tool works exactly as before, because not one of them depends on this
 * component (see {@link ignoreLoadFailure}).
 */

/** The only event name this site sends. */
export const PAGE_VIEW_EVENT = "page_view";

/** The only parameters it sends with it. */
export type PageViewParameters = {
  /** Path of the page, from the router — never a query string or a fragment. */
  page_path: string;
  /** The document title, which is the tool's name plus the site's. */
  page_title: string;
};

/**
 * The global `gtag` the bootstrap script below defines, typed down to the one
 * call this site makes. Anything else — a custom event, a `set` of a user id —
 * is a type error rather than a review comment.
 */
type Gtag = (
  command: "event",
  eventName: typeof PAGE_VIEW_EVENT,
  parameters: PageViewParameters,
) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** `id` of the `<script>` that fetches gtag.js. */
export const GTAG_SCRIPT_ID = "ga4-gtag";

/** `id` of the inline `<script>` that configures the measurement. */
export const GTAG_INIT_SCRIPT_ID = "ga4-init";

/** Where gtag.js is fetched from, for a given measurement ID. */
export function gtagScriptSrc(measurementId: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
}

/**
 * How the measurement is configured, and the whole of it.
 *
 * `send_page_view` is what records the page the visitor happened to accept on;
 * every later page view is sent by the effect below. The two `allow_` flags
 * switch off Google Signals and ad personalisation, which is what keeps this a
 * traffic counter rather than cross-site advertising data. There is no
 * `user_id`, no `client_id` of our own and no custom parameter. IP handling is
 * left at the GA4 default, under which full IP addresses are not stored.
 */
export const GA_CONFIG = {
  send_page_view: true,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
} as const;

/**
 * The inline bootstrap: the standard gtag.js snippet, with this site's
 * configuration and no other call.
 */
export function gtagBootstrapScript(measurementId: string): string {
  return [
    "window.dataLayer = window.dataLayer || [];",
    "function gtag(){dataLayer.push(arguments);}",
    "gtag('js', new Date());",
    `gtag('config', ${JSON.stringify(measurementId)}, ${JSON.stringify(GA_CONFIG)});`,
  ].join("\n");
}

/**
 * What happens when gtag.js does not load: nothing.
 *
 * An ad-blocker blocking googletagmanager.com is the normal case, not an
 * error, and a visitor converting a weight has no use for the news. So there
 * is no retry, no second source, no console noise and nothing rendered — the
 * handler exists only so the rejected load promise inside `next/script` is
 * handled rather than left unhandled (REQ-11: the page stays fully usable and
 * no error is shown).
 */
function ignoreLoadFailure(): void {
  return undefined;
}

/**
 * The page view for a path, built from the two permitted parameters and
 * nothing that was typed into a tool.
 */
function pageViewFor(pathname: string): PageViewParameters {
  return { page_path: pathname, page_title: document.title };
}

/**
 * Loads GA4 once consent has been given, and reports page views for the rest
 * of the session.
 *
 * Mounted once by the root layout, inside `ConsentProvider` and after the page
 * content, so it can neither delay the first render nor be reached by a page
 * that is outside the provider.
 */
export function Analytics() {
  const { consent } = useConsent();
  const pathname = usePathname();

  const enabled = consent === "accepted" && isAnalyticsEnabled();

  /**
   * The last path GA has been told about, so a page view is sent once and only
   * once per navigation. It starts as `null` and is filled in — without
   * sending anything — the first time analytics is enabled, because
   * `gtag('config', ...)` has already sent the page view for the page the
   * visitor accepted on. Counting it again here would double every session's
   * first page.
   */
  const reportedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Consent withdrawn, or never given: forget where we were, so a later
      // Accept starts again from its own `config` page view.
      reportedPath.current = null;
      return;
    }

    if (reportedPath.current === null) {
      reportedPath.current = pathname;
      return;
    }

    if (reportedPath.current === pathname) {
      return;
    }

    reportedPath.current = pathname;

    // Absent when gtag.js is blocked or has not finished loading. Either way
    // the page view is simply not sent; nothing waits for it and nothing
    // retries.
    window.gtag?.("event", PAGE_VIEW_EVENT, pageViewFor(pathname));
  }, [enabled, pathname]);

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Script
        id={GTAG_SCRIPT_ID}
        src={gtagScriptSrc(GA_MEASUREMENT_ID)}
        strategy="afterInteractive"
        onError={ignoreLoadFailure}
      />
      <Script
        id={GTAG_INIT_SCRIPT_ID}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: gtagBootstrapScript(GA_MEASUREMENT_ID),
        }}
      />
    </>
  );
}

export default Analytics;
