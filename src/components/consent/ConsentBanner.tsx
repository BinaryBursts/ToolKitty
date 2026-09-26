"use client";

import Link from "next/link";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui";

import { useConsent } from "./ConsentProvider";

/** The banner's short title, which also names its landmark region. */
export const CONSENT_TITLE = "Analytics cookies?";

/**
 * The whole of what the banner says, in one line: what is measured, why we
 * are asking, and the fact that refusing costs the visitor nothing.
 */
export const CONSENT_MESSAGE =
  "We use Google Analytics to count page views. It sets cookies, so we ask " +
  "first. Tools work either way.";

/** Label on the link to the policy that explains the rest. */
export const CONSENT_POLICY_LINK_LABEL = "Privacy policy";

/** Labels on the two answers. Neither is the quiet one. */
export const CONSENT_ACCEPT_LABEL = "Accept";
export const CONSENT_DECLINE_LABEL = "Decline";

/** Id of the visible title the region is named by. */
const TITLE_ID = "consent-banner-title";

/**
 * Custom property the bar's measured height is published on, so the page can
 * reserve exactly that much space below its content.
 */
export const CONSENT_HEIGHT_PROPERTY = "--t-consent-h";

/**
 * Reserve space at the bottom of the page for the pinned bar.
 *
 * The bar is `position: fixed`, so it is out of the flow and would otherwise
 * sit on top of whatever happens to be at the bottom of the viewport — the
 * tool on a short page, the privacy notice on a phone. Its height depends on
 * how the copy wraps, which depends on the width, so it is measured rather
 * than guessed and republished whenever it changes; `globals.css` turns the
 * value into padding at the end of the page column (see `--t-consent-h`).
 *
 * This writes one CSS custom property onto the document body and removes it
 * again when the banner goes. It is not storage of any kind: nothing about
 * the visitor is recorded, and nothing survives the page.
 */
function useReservedSpace(element: HTMLElement | null): void {
  useLayoutEffect(() => {
    if (element === null) {
      return;
    }

    const { body } = document;

    const publishHeight = () => {
      body.style.setProperty(
        CONSENT_HEIGHT_PROPERTY,
        `${element.offsetHeight}px`,
      );
    };

    publishHeight();

    // Not every environment the tests run in has ResizeObserver; the initial
    // measurement above is what matters, re-measuring is the refinement.
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(publishHeight)
        : null;

    observer?.observe(element);

    return () => {
      observer?.disconnect();
      body.style.removeProperty(CONSENT_HEIGHT_PROPERTY);
    };
  }, [element]);
}

/** Nothing to subscribe to: the answer below never changes after hydration. */
const subscribeToNothing = () => () => {};

/**
 * False while the exported HTML is being rendered and during hydration, true
 * from the first client render onwards.
 *
 * This is the supported way to render something on the client only — React
 * takes the server snapshot for the hydration pass and re-renders with the
 * client one straight after, so there is no hydration mismatch and no
 * setState in an effect.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

/**
 * The bar itself, rendered only while the question is open.
 *
 * Deliberately **not** a modal: no backdrop, no `role="dialog"`, no
 * `aria-modal`, no focus trap and nothing that touches the page's scrolling.
 * A visitor who would rather convert a weight than answer a cookie question
 * can do exactly that, with the mouse or with the keyboard, and the banner
 * simply stays where it is.
 */
function ConsentBar() {
  const { accept, decline } = useConsent();
  const [bar, setBar] = useState<HTMLElement | null>(null);

  useReservedSpace(bar);

  return (
    <section className="t-consent" ref={setBar} aria-labelledby={TITLE_ID}>
      <div className="o-container t-consent__inner">
        <div className="o-stack--tight t-consent__copy">
          <span className="o-strong" id={TITLE_ID}>
            {CONSENT_TITLE}
          </span>
          <p className="o-small o-muted t-consent__text">
            {CONSENT_MESSAGE}{" "}
            <Link href="/privacy">{CONSENT_POLICY_LINK_LABEL}</Link>
          </p>
        </div>

        {/* Two plain buttons of the same variant and size, side by side. The
            refusal is not a link, not smaller and not behind a settings
            screen (REQ-11). */}
        <div className="o-row t-consent__actions">
          <Button variant="secondary" onClick={decline}>
            {CONSENT_DECLINE_LABEL}
          </Button>
          <Button variant="secondary" onClick={accept}>
            {CONSENT_ACCEPT_LABEL}
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * The cookie consent banner (REQ-11), mounted once by the root layout so it
 * is on the homepage, every tool page, /privacy, /about and the 404 page
 * alike.
 *
 * It is shown while — and only while — the session's answer is
 * `"unanswered"`. Either answer unmounts it for the rest of the session, and
 * neither writes anything anywhere: a reload starts the session over and the
 * banner is back, which is what the site storing nothing amounts to in
 * practice (see {@link file://./ConsentProvider.tsx}).
 *
 * It renders after the first client render rather than in the exported HTML.
 * Two reasons, both about not lying to the visitor: with JavaScript switched
 * off nothing could load analytics and nothing could dismiss the bar, so a
 * baked-in banner would be an un-answerable question; and appearing in the
 * same commit as the space reserved for it means there is never a frame in
 * which a pinned bar covers the tool.
 */
export function ConsentBanner() {
  const { consent } = useConsent();
  const hydrated = useHydrated();

  if (!hydrated || consent !== "unanswered") {
    return null;
  }

  return <ConsentBar />;
}

export default ConsentBanner;
