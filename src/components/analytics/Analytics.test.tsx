import { render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as SiteConfig from "@/config/site";

import {
  ConsentProvider,
  useConsent,
  type ConsentState,
} from "@/components/consent/ConsentProvider";

import {
  Analytics,
  GA_CONFIG,
  GTAG_INIT_SCRIPT_ID,
  GTAG_SCRIPT_ID,
  gtagBootstrapScript,
  gtagScriptSrc,
  PAGE_VIEW_EVENT,
} from "./Analytics";

/**
 * The measurement ID, swapped per test.
 *
 * `@/config/site` is mocked below with a getter over this, so a test can run
 * the component with an ID configured and with the empty placeholder that is
 * committed today, without either case depending on what the constant happens
 * to hold in `src/config/site.ts` on the day the suite runs.
 */
const config = vi.hoisted(() => ({ measurementId: "G-TEST1234567" }));

vi.mock("@/config/site", async (importOriginal) => {
  const actual = await importOriginal<typeof SiteConfig>();

  return {
    ...actual,
    get GA_MEASUREMENT_ID() {
      return config.measurementId;
    },
    isAnalyticsEnabled: () => config.measurementId.length > 0,
  };
});

/** The current pathname, as the router would report it. */
const router = vi.hoisted(() => ({ pathname: "/tools/weight-converter" }));

vi.mock("next/navigation", () => ({
  usePathname: () => router.pathname,
}));

/**
 * `next/script` stands in as a plain `<script>` element.
 *
 * The real component appends the tag to `document.body` from an effect and
 * keeps a module-level cache of what it has already loaded, so a second render
 * of the same `id` in the same test file would silently do nothing — the cache
 * is not resettable from outside. Standing a real script element in its place
 * keeps every case below independent and still asserts the thing that matters:
 * whether a script tag exists, and what is in it. That the props are the ones
 * `next/script` accepts is checked by the type-checker, since `Analytics`
 * imports the real component.
 */
vi.mock("next/script", () => ({
  default: ({
    id,
    src,
    strategy,
    dangerouslySetInnerHTML,
  }: {
    id?: string;
    src?: string;
    strategy?: string;
    dangerouslySetInnerHTML?: { __html: string };
    onError?: () => void;
  }) => (
    // A test double, not a script on a page: jsdom fetches nothing, and the
    // real loading strategy belongs to `next/script`, which this replaces. The
    // synchronous-script rule has nothing to warn about here.
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script
      id={id}
      src={src}
      data-strategy={strategy}
      data-nscript-mock=""
      {...(dangerouslySetInnerHTML ? { dangerouslySetInnerHTML } : {})}
    />
  ),
}));

/** Sets the session's consent answer the way the banner's buttons would. */
function ConsentAs({ answer }: { answer: ConsentState }) {
  const { accept, decline } = useConsent();

  useEffect(() => {
    if (answer === "accepted") accept();
    if (answer === "declined") decline();
  }, [answer, accept, decline]);

  return null;
}

/** The shell as the root layout assembles it: a page, then the loader. */
function Shell({ answer }: { answer: ConsentState }) {
  return (
    <ConsentProvider>
      <main id="content">
        <h1>Weight converter</h1>
      </main>
      <ConsentAs answer={answer} />
      <Analytics />
    </ConsentProvider>
  );
}

/** Every script tag in the document, wherever React chose to put it. */
const scriptTags = (): HTMLScriptElement[] => [
  ...document.querySelectorAll<HTMLScriptElement>("script[data-nscript-mock]"),
];

const scriptWithId = (id: string): HTMLScriptElement | undefined =>
  scriptTags().find((script) => script.id === id);

/** Calls made to the global `gtag`, as `[command, event, parameters]`. */
let gtagCalls: unknown[][] = [];

beforeEach(() => {
  config.measurementId = "G-TEST1234567";
  router.pathname = "/tools/weight-converter";
  document.title = "Weight converter · ToolKitty";

  gtagCalls = [];
  window.gtag = ((...args: unknown[]) => {
    gtagCalls.push(args);
  }) as unknown as typeof window.gtag;
});

afterEach(() => {
  delete window.gtag;
  delete window.dataLayer;
});

describe("Analytics, before consent", () => {
  it("renders nothing at all while the banner is unanswered", () => {
    render(<Shell answer="unanswered" />);

    expect(scriptTags()).toHaveLength(0);
    expect(gtagCalls).toHaveLength(0);
  });

  it("renders nothing at all when the visitor declined", () => {
    render(<Shell answer="declined" />);

    expect(scriptTags()).toHaveLength(0);
    expect(gtagCalls).toHaveLength(0);
  });

  it("leaves the page it sits beside completely alone either way", () => {
    render(<Shell answer="declined" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Weight converter" }),
    ).toBeInTheDocument();
  });

  it("writes no cookie and no storage of its own, whatever the answer", () => {
    const cookiesBefore = document.cookie;

    for (const answer of ["unanswered", "declined", "accepted"] as const) {
      const view = render(<Shell answer={answer} />);

      expect(document.cookie).toBe(cookiesBefore);
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);

      view.unmount();
    }
  });
});

describe("Analytics, once consent is given", () => {
  it("renders both gtag script tags", () => {
    render(<Shell answer="accepted" />);

    expect(scriptTags()).toHaveLength(2);

    const loader = scriptWithId(GTAG_SCRIPT_ID);
    expect(loader).toBeDefined();
    expect(loader).toHaveAttribute(
      "src",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST1234567",
    );
    expect(loader).toHaveAttribute("data-strategy", "afterInteractive");

    const init = scriptWithId(GTAG_INIT_SCRIPT_ID);
    expect(init).toBeDefined();
    expect(init).toHaveAttribute("data-strategy", "afterInteractive");
    expect(init?.innerHTML).toBe(gtagBootstrapScript("G-TEST1234567"));
  });

  it("configures the measurement conservatively and with no extras", () => {
    const snippet = gtagBootstrapScript("G-TEST1234567");

    expect(snippet).toContain("window.dataLayer = window.dataLayer || []");
    expect(snippet).toContain("gtag('js', new Date())");
    expect(snippet).toContain("gtag('config', \"G-TEST1234567\"");

    // Exactly the three settings, and nothing that identifies a person.
    expect(GA_CONFIG).toEqual({
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    expect(snippet).not.toMatch(/user_id|client_id|custom_map|anonymize_ip/);

    // gtag.js is the only third party fetched: no tag manager container.
    expect(gtagScriptSrc("G-TEST1234567")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST1234567",
    );
    expect(gtagScriptSrc("G-TEST1234567")).not.toContain("gtm.js");
  });

  it("renders nothing when the measurement ID has not been supplied", () => {
    config.measurementId = "";

    render(<Shell answer="accepted" />);

    expect(scriptTags()).toHaveLength(0);
    expect(gtagCalls).toHaveLength(0);
  });

  it("sends no page view for the page consent was given on — the config call did", () => {
    render(<Shell answer="accepted" />);

    expect(gtagCalls).toHaveLength(0);
  });
});

describe("Analytics, on client-side navigation", () => {
  it("sends exactly one page view, carrying only the path and the title", () => {
    const { rerender } = render(<Shell answer="accepted" />);

    router.pathname = "/tools/password-generator";
    document.title = "Password generator · ToolKitty";
    rerender(<Shell answer="accepted" />);

    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0]).toEqual([
      "event",
      PAGE_VIEW_EVENT,
      {
        page_path: "/tools/password-generator",
        page_title: "Password generator · ToolKitty",
      },
    ]);

    // "Only the path and the title" literally: no fourth argument, and no
    // third key on the parameters.
    expect(gtagCalls[0]).toHaveLength(3);
    expect(Object.keys(gtagCalls[0]![2] as object).sort()).toEqual([
      "page_path",
      "page_title",
    ]);
  });

  it("does not send the same page twice when the component re-renders", () => {
    const { rerender } = render(<Shell answer="accepted" />);

    router.pathname = "/tools/json-formatter";
    rerender(<Shell answer="accepted" />);
    rerender(<Shell answer="accepted" />);
    rerender(<Shell answer="accepted" />);

    expect(gtagCalls).toHaveLength(1);
  });

  it("sends nothing on navigation when the visitor declined", () => {
    const { rerender } = render(<Shell answer="declined" />);

    router.pathname = "/tools/json-formatter";
    rerender(<Shell answer="declined" />);

    expect(gtagCalls).toHaveLength(0);
    expect(scriptTags()).toHaveLength(0);
  });

  it("sends nothing on navigation when no measurement ID is configured", () => {
    config.measurementId = "";

    const { rerender } = render(<Shell answer="accepted" />);

    router.pathname = "/tools/json-formatter";
    rerender(<Shell answer="accepted" />);

    expect(gtagCalls).toHaveLength(0);
  });

  it("survives gtag.js being blocked: no throw, no error, nothing sent", () => {
    // What an ad-blocker leaves behind: the inline snippet may never have run,
    // so there is no global to call.
    delete window.gtag;

    const { rerender } = render(<Shell answer="accepted" />);

    router.pathname = "/tools/temperature-converter";

    expect(() => rerender(<Shell answer="accepted" />)).not.toThrow();
    expect(
      screen.getByRole("heading", { level: 1, name: "Weight converter" }),
    ).toBeInTheDocument();
  });
});
