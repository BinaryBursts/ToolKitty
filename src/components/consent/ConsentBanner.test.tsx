import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as SiteConfig from "@/config/site";

import AboutPage from "@/app/about/page";
import HomePage from "@/app/page";
import NotFound from "@/app/not-found";
import PrivacyPage from "@/app/privacy/page";
import ToolRoute from "@/app/tools/[slug]/page";

import {
  CONSENT_ACCEPT_LABEL,
  CONSENT_DECLINE_LABEL,
  CONSENT_HEIGHT_PROPERTY,
  CONSENT_MESSAGE,
  CONSENT_TITLE,
  ConsentBanner,
} from "./ConsentBanner";
import { ConsentProvider } from "./ConsentProvider";

/**
 * The measurement ID, swapped per test, mocked the way
 * `src/components/analytics/Analytics.test.tsx` mocks it: a getter over a
 * hoisted value, with the enabled/disabled rule left to the real pattern in
 * `@/config/site`.
 *
 * The banner only asks about Google Analytics, so whether there is an
 * analytics ID configured decides whether it appears at all. Most of the file
 * runs with one configured — the state the site is in once the owner has
 * pasted theirs — and "no analytics configured" is a suite of its own at the
 * foot. Neither depends on what `GA_MEASUREMENT_ID` happens to hold on the day
 * the suite runs.
 */
const config = vi.hoisted(() => ({ measurementId: "G-TEST1234567" }));

const CONFIGURED_ID = "G-TEST1234567";

vi.mock("@/config/site", async (importOriginal) => {
  const actual = await importOriginal<typeof SiteConfig>();

  return {
    ...actual,
    get GA_MEASUREMENT_ID() {
      return config.measurementId;
    },
    isAnalyticsEnabled: () =>
      actual.GA_MEASUREMENT_ID_PATTERN.test(config.measurementId),
  };
});

afterEach(() => {
  config.measurementId = CONFIGURED_ID;
});

/**
 * The classes both answers must carry, identically — written out here rather
 * than imported from the component, so the test pins the rendered result
 * instead of agreeing with it (REQ-11: same size, same emphasis).
 */
const CONSENT_BUTTON_CLASS = "o-btn o-btn--secondary";

/**
 * A stand-in for a page of the site: a heading, a control the visitor came to
 * use, and the privacy notice every tool page carries. The banner has to
 * leave all of it usable.
 */
function StandInPage({ name = "Weight converter" }: { name?: string }) {
  return (
    <main id="content">
      <h1>{name}</h1>
      <p>Everything you type into this tool stays in your browser.</p>
      <button type="button">Convert</button>
    </main>
  );
}

/** The shell as the root layout assembles it: page, then banner, in memory. */
function Shell({ children }: { children?: ReactNode }) {
  return (
    <ConsentProvider>
      {children ?? <StandInPage />}
      <ConsentBanner />
    </ConsentProvider>
  );
}

/**
 * The banner, found the way a screen reader finds it: the landmark region
 * named by its title. Deliberately the only way these tests look for it — a
 * fallback on the copy would let the landmark lose its accessible name
 * without a single test noticing.
 */
const banner = () => screen.queryByRole("region", { name: CONSENT_TITLE });

const acceptButton = () =>
  screen.getByRole("button", { name: CONSENT_ACCEPT_LABEL });
const declineButton = () =>
  screen.getByRole("button", { name: CONSENT_DECLINE_LABEL });

describe("ConsentBanner", () => {
  it("is shown on a page that has not been answered yet, with the page still usable", () => {
    render(<Shell />);

    expect(banner()).not.toBeNull();
    expect(screen.getByText(CONSENT_MESSAGE)).toBeInTheDocument();

    // The tool behind it is untouched: heading, copy and control all present
    // and enabled.
    expect(
      screen.getByRole("heading", { level: 1, name: "Weight converter" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert" })).toBeEnabled();
  });

  it("links to the privacy policy", () => {
    render(<Shell />);

    expect(
      screen.getByRole("link", { name: "Privacy policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("disappears for the rest of the session when Accept is pressed", () => {
    render(<Shell />);

    fireEvent.click(acceptButton());

    expect(banner()).toBeNull();
  });

  it("disappears when Decline is pressed, and writes nothing anywhere", () => {
    const cookiesBefore = document.cookie;

    render(<Shell />);

    fireEvent.click(declineButton());

    expect(banner()).toBeNull();
    expect(document.cookie).toBe(cookiesBefore);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("writes nothing when Accept is pressed either, or when it is ignored", () => {
    const cookiesBefore = document.cookie;

    render(<Shell />);

    // Ignored.
    expect(document.cookie).toBe(cookiesBefore);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    fireEvent.click(acceptButton());

    expect(document.cookie).toBe(cookiesBefore);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("stays dismissed as the visitor moves to another page in the same session", () => {
    const { rerender } = render(<Shell />);

    fireEvent.click(acceptButton());
    expect(banner()).toBeNull();

    // Client-side navigation: the page under the provider changes, the
    // provider itself does not remount.
    rerender(
      <Shell>
        <StandInPage name="Password generator" />
      </Shell>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Password generator" }),
    ).toBeInTheDocument();
    expect(banner()).toBeNull();
  });

  it("is shown again on a fresh mount, which is what a reload is", () => {
    const accepted = render(<Shell />);

    fireEvent.click(acceptButton());
    expect(banner()).toBeNull();
    accepted.unmount();

    // Nothing was written, so there is nothing for the new page to read back.
    const reloaded = render(<Shell />);
    expect(banner()).not.toBeNull();

    // Same again after a refusal.
    fireEvent.click(declineButton());
    expect(banner()).toBeNull();
    reloaded.unmount();

    render(<Shell />);
    expect(banner()).not.toBeNull();
  });

  it("gives Accept and Decline identical buttons — same element, same classes", () => {
    render(<Shell />);

    const accept = acceptButton();
    const decline = declineButton();

    expect(accept.tagName).toBe("BUTTON");
    expect(decline.tagName).toBe("BUTTON");
    expect(accept.className).toBe(CONSENT_BUTTON_CLASS);
    expect(decline.className).toBe(accept.className);

    // Neither is hidden behind a further screen, and neither is a link
    // dressed as an afterthought.
    expect(accept).toBeVisible();
    expect(decline).toBeVisible();
    expect(accept).toHaveAttribute("type", "button");
    expect(decline).toHaveAttribute("type", "button");
  });

  it("keeps both answers in the natural tab order, reachable and operable", () => {
    render(<Shell />);

    const accept = acceptButton();
    const decline = declineButton();

    // Native buttons with no tabindex of their own: Tab reaches them and
    // Enter and Space activate them, because the platform says so.
    for (const button of [decline, accept]) {
      expect(button).not.toHaveAttribute("tabindex");
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute("aria-hidden");
    }

    decline.focus();
    expect(decline).toHaveFocus();

    // Focus is not trapped: something outside the banner can take it while
    // the banner is still up.
    const convert = screen.getByRole("button", { name: "Convert" });
    convert.focus();
    expect(convert).toHaveFocus();
    expect(banner()).not.toBeNull();
  });

  it("is a named landmark region, not a modal dialog", () => {
    const { container } = render(<Shell />);

    const region = screen.getByRole("region", { name: CONSENT_TITLE });

    expect(region.tagName).toBe("SECTION");
    expect(region).toHaveClass("t-consent");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(container.querySelector("[aria-modal]")).toBeNull();
  });

  it("is last in the document, after the page it belongs to", () => {
    const { container } = render(<Shell />);

    const children = [...container.children];
    const main = container.querySelector("main");
    const region = container.querySelector(".t-consent");

    expect(children.indexOf(region!)).toBe(children.length - 1);
    expect(children.indexOf(region!)).toBeGreaterThan(children.indexOf(main!));
  });

  it("locks nothing: page scrolling is left exactly as it was", () => {
    const before = document.body.style.overflow;

    render(<Shell />);

    expect(document.body.style.overflow).toBe(before);
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("reserves its own height at the end of the page, and gives it back", () => {
    const { unmount } = render(<Shell />);

    // jsdom lays nothing out, so the measurement is 0px here; what this
    // checks is that the reservation is published while the banner is up and
    // removed the moment it goes, so no page is left with a gap.
    expect(
      document.body.style.getPropertyValue(CONSENT_HEIGHT_PROPERTY),
    ).toMatch(/^\d+px$/);

    fireEvent.click(acceptButton());

    expect(document.body.style.getPropertyValue(CONSENT_HEIGHT_PROPERTY)).toBe(
      "",
    );

    unmount();
  });
});

/**
 * REQ-11 asks for the banner on every page, which the root layout delivers by
 * mounting it once around all of them. These render the real pages inside the
 * same shell the layout builds, so "every page" is checked against the pages
 * themselves rather than against a stand-in.
 */
describe("the banner on each kind of page", () => {
  it("appears with the homepage", () => {
    render(<Shell>{<HomePage />}</Shell>);

    expect(banner()).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("appears with a tool page, whose tool still works", async () => {
    const toolPage = (await ToolRoute({
      params: Promise.resolve({ slug: "weight-converter" }),
      searchParams: Promise.resolve({}),
    })) as ReactElement;

    const { container } = render(<Shell>{toolPage}</Shell>);

    expect(banner()).not.toBeNull();

    // The two things the banner is forbidden to swallow on a tool page: the
    // tool's own controls, and the privacy notice the shared template renders
    // above it (REQ-9). Both are present and neither is disabled.
    const controls = [...container.querySelectorAll("input, select, textarea")];
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control).toBeEnabled();
    }
    expect(
      screen.getByText(/stays in your browser/i, { exact: false }),
    ).toBeInTheDocument();
  });

  it("appears with the privacy policy, without covering it", () => {
    render(<Shell>{<PrivacyPage />}</Shell>);

    expect(banner()).not.toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy policy" }),
    ).toBeInTheDocument();
  });

  it("appears with the About page", () => {
    render(<Shell>{<AboutPage />}</Shell>);

    expect(banner()).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("appears with the 404 page", () => {
    render(<Shell>{<NotFound />}</Shell>);

    expect(banner()).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});

/**
 * With no usable measurement ID there is nothing the banner could ask
 * permission for: no script can load and no cookie can be set whatever the
 * visitor presses. The owner's decision at review of this ticket was to show
 * no banner at all in that state rather than ask an empty question, so this is
 * the behaviour of the site as it is committed today — `GA_MEASUREMENT_ID` is
 * still the empty placeholder.
 */
describe("when no analytics measurement ID is configured", () => {
  const noBanner = (label: string) => {
    it(`shows nothing on ${label}, and leaves the page whole`, () => {
      render(<Shell />);

      expect(banner()).toBeNull();
      expect(
        screen.queryByRole("button", { name: CONSENT_ACCEPT_LABEL }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: CONSENT_DECLINE_LABEL }),
      ).toBeNull();
      expect(screen.queryByText(CONSENT_MESSAGE)).toBeNull();

      // The page itself is untouched — no banner is not a broken page.
      expect(
        screen.getByRole("heading", { level: 1, name: "Weight converter" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Convert" })).toBeEnabled();
    });
  };

  describe("because the placeholder is still empty", () => {
    beforeEach(() => {
      config.measurementId = "";
    });

    noBanner("a page");

    it("reserves no space at the foot of the page", () => {
      render(<Shell />);

      expect(
        document.body.style.getPropertyValue(CONSENT_HEIGHT_PROPERTY),
      ).toBe("");
    });

    it("shows nothing on any of the real pages either", () => {
      const { unmount } = render(<Shell>{<HomePage />}</Shell>);
      expect(banner()).toBeNull();
      unmount();

      const privacy = render(<Shell>{<PrivacyPage />}</Shell>);
      expect(banner()).toBeNull();
      privacy.unmount();

      render(<Shell>{<NotFound />}</Shell>);
      expect(banner()).toBeNull();
    });
  });

  describe("because what is configured is not a measurement ID", () => {
    beforeEach(() => {
      // Treated exactly like an absent one, as `Analytics` treats it: a value
      // of the wrong shape measures nothing, so asking about it would be
      // asking about nothing.
      config.measurementId = "UA-12345-6";
    });

    noBanner("a page whose ID is malformed");
  });

  it("comes back the moment an ID is configured, with no other change", () => {
    config.measurementId = "";
    const off = render(<Shell />);
    expect(banner()).toBeNull();
    off.unmount();

    config.measurementId = CONFIGURED_ID;
    render(<Shell />);

    expect(banner()).not.toBeNull();
    expect(
      screen.getByRole("button", { name: CONSENT_ACCEPT_LABEL }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: CONSENT_DECLINE_LABEL }),
    ).toBeEnabled();
  });
});
