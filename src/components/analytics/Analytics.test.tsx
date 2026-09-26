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
  GTAG_SCRIPT_ID,
  gtagScriptSrc,
  PAGE_VIEW_EVENT,
} from "./Analytics";

/**
 * The measurement ID, swapped per test.
 *
 * `@/config/site` is mocked below with a getter over this, so a test can run
 * the component with an ID configured, with the empty placeholder that is
 * committed today, and with a malformed value — without any of them depending
 * on what the constant happens to hold in `src/config/site.ts` on the day the
 * suite runs. The enabled/disabled rule itself is the real one: the mock
 * defers to the pattern exported by the real module.
 */
const config = vi.hoisted(() => ({ measurementId: "G-TEST1234567" }));

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

/** The current pathname, as the router would report it. */
const router = vi.hoisted(() => ({ pathname: "/tools/weight-converter" }));

vi.mock("next/navigation", () => ({
  usePathname: () => router.pathname,
}));

type ScriptProps = {
  id?: string;
  src?: string;
  strategy?: string;
  onError?: (error: Error) => void;
};

/** Every set of props the component handed to `next/script`, in order. */
const rendered = vi.hoisted(() => ({ scripts: [] as unknown[] }));

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
  default: (props: ScriptProps) => {
    rendered.scripts.push(props);

    const { id, src, strategy } = props;

    return (
      // A test double, not a script on a page: jsdom fetches nothing, and the
      // real loading strategy belongs to `next/script`, which this replaces.
      // The synchronous-script rule has nothing to warn about here.
      // eslint-disable-next-line @next/next/no-sync-scripts
      <script id={id} src={src} data-strategy={strategy} data-nscript-mock="" />
    );
  },
}));

/** The props of the script tag with this `id`, as the component set them. */
const propsOf = (id: string): ScriptProps | undefined =>
  (rendered.scripts as ScriptProps[]).find((script) => script.id === id);

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

/** Calls made to the global `gtag`, as `[command, ...arguments]`. */
let gtagCalls: unknown[][] = [];

/** Just the events among them — the only ones that measure a visit. */
const events = (): unknown[][] =>
  gtagCalls.filter((call) => call[0] === "event");

beforeEach(() => {
  config.measurementId = "G-TEST1234567";
  router.pathname = "/tools/weight-converter";
  document.title = "Weight converter · ToolKitty";

  rendered.scripts = [];

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
    expect(window.dataLayer).toBeUndefined();
  });

  it("renders nothing at all when the visitor declined", () => {
    render(<Shell answer="declined" />);

    expect(scriptTags()).toHaveLength(0);
    expect(gtagCalls).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
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
  it("renders the gtag.js script tag", () => {
    render(<Shell answer="accepted" />);

    expect(scriptTags()).toHaveLength(1);

    const loader = scriptWithId(GTAG_SCRIPT_ID);
    expect(loader).toBeDefined();
    expect(loader).toHaveAttribute(
      "src",
      "https://www.googletagmanager.com/gtag/js?id=G-TEST1234567",
    );
    expect(loader).toHaveAttribute("data-strategy", "afterInteractive");

    // gtag.js itself, not a tag manager container, and no inline script.
    expect(gtagScriptSrc("G-TEST1234567")).not.toContain("gtm.js");
    expect(propsOf(GTAG_SCRIPT_ID)).not.toHaveProperty(
      "dangerouslySetInnerHTML",
    );
  });

  it("opens the measurement conservatively, and with nothing else", () => {
    render(<Shell answer="accepted" />);

    expect(gtagCalls).toHaveLength(2);

    const [js, configure] = gtagCalls;
    expect(js?.[0]).toBe("js");
    expect(js?.[1]).toBeInstanceOf(Date);

    expect(configure).toEqual([
      "config",
      "G-TEST1234567",
      {
        send_page_view: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    ]);

    // The settings object is the whole configuration: no user id, no custom
    // parameter, nothing that identifies a person.
    expect(Object.keys(GA_CONFIG).sort()).toEqual([
      "allow_ad_personalization_signals",
      "allow_google_signals",
      "send_page_view",
    ]);
  });

  it("opens it once, however often the component re-renders", () => {
    const { rerender } = render(<Shell answer="accepted" />);

    rerender(<Shell answer="accepted" />);
    rerender(<Shell answer="accepted" />);

    expect(gtagCalls.filter((call) => call[0] === "config")).toHaveLength(1);
  });

  it("creates the data layer and queues onto it when nothing else has", () => {
    // No spy this time: the real bootstrap has to stand up the queue itself,
    // exactly as Google's snippet would.
    delete window.gtag;

    render(<Shell answer="accepted" />);

    expect(typeof window.gtag).toBe("function");
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer).toHaveLength(2);

    // Each entry is the `arguments` object gtag.js expects, not an array.
    const queued = (window.dataLayer ?? []) as IArguments[];
    expect(Array.isArray(queued[0])).toBe(false);
    expect([...queued[0]!][0]).toBe("js");
    expect([...queued[1]!][0]).toBe("config");
    expect([...queued[1]!][1]).toBe("G-TEST1234567");
  });

  it("renders nothing when the measurement ID has not been supplied", () => {
    config.measurementId = "";

    render(<Shell answer="accepted" />);

    expect(scriptTags()).toHaveLength(0);
    expect(gtagCalls).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
  });

  it.each([
    "not-an-id",
    "G-",
    "UA-123456-1",
    "GTM-ABCD123",
    'G-1"></script><script>alert(1)</script>',
    " G-ABCD123456 ",
  ])("renders nothing for the unusable measurement ID %j", (id) => {
    // A value of the wrong shape cannot measure anything, so it is treated as
    // an absent one rather than handed to Google or put into a URL.
    config.measurementId = id;

    render(<Shell answer="accepted" />);

    expect(scriptTags()).toHaveLength(0);
    expect(gtagCalls).toHaveLength(0);
  });

  it("sends no page-view event for the page consent was given on", () => {
    render(<Shell answer="accepted" />);

    // `send_page_view: true` in the config call is what records it; sending
    // one here as well would count the session's first page twice.
    expect(events()).toHaveLength(0);
  });

  it("swallows a failed load: nothing thrown, nothing logged, nothing shown", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    try {
      render(<Shell answer="accepted" />);

      const onError = propsOf(GTAG_SCRIPT_ID)?.onError;
      expect(onError).toBeTypeOf("function");

      // What an ad-blocker, an offline visitor or a Google outage produces.
      expect(() =>
        onError?.(new Error("net::ERR_BLOCKED_BY_CLIENT")),
      ).not.toThrow();

      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();

      // The page is untouched, and no message was put in front of the visitor.
      expect(
        screen.getByRole("heading", { level: 1, name: "Weight converter" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(document.body.textContent).not.toMatch(/analytics|error/i);
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }
  });
});

describe("Analytics, on client-side navigation", () => {
  it("sends exactly one page view, carrying only the path and the title", () => {
    const { rerender } = render(<Shell answer="accepted" />);

    router.pathname = "/tools/password-generator";
    document.title = "Password generator · ToolKitty";
    rerender(<Shell answer="accepted" />);

    expect(events()).toHaveLength(1);
    expect(events()[0]).toEqual([
      "event",
      PAGE_VIEW_EVENT,
      {
        page_path: "/tools/password-generator",
        page_title: "Password generator · ToolKitty",
      },
    ]);

    // "Only the path and the title" literally: no fourth argument, and no
    // third key on the parameters.
    expect(events()[0]).toHaveLength(3);
    expect(Object.keys(events()[0]![2] as object).sort()).toEqual([
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

    expect(events()).toHaveLength(1);
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
    const { rerender } = render(<Shell answer="accepted" />);

    // What a blocked tag leaves behind: our own queue, which nothing drains.
    // Removing the global entirely is the harsher case — the page view is
    // simply not sent, and nothing about the page changes.
    delete window.gtag;
    router.pathname = "/tools/temperature-converter";

    expect(() => rerender(<Shell answer="accepted" />)).not.toThrow();
    expect(
      screen.getByRole("heading", { level: 1, name: "Weight converter" }),
    ).toBeInTheDocument();
    expect(events()).toHaveLength(0);
  });
});
