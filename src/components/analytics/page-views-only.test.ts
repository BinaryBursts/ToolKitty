import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * REQ-11: Google Analytics receives page views and nothing else. No custom
 * event, and above all no value a visitor typed — a generated password, a
 * pasted JSON document, a weight, a temperature, a homepage search term — may
 * ever reach `gtag` or the data layer.
 *
 * Prose in a code review cannot hold that line for the life of the site; the
 * mistake arrives as a well-meant "let's measure which unit people pick", in a
 * change that has nothing to do with analytics. So the rule is enforced here,
 * by scanning the source:
 *
 * 1. Only `src/components/analytics` may mention `gtag`, `dataLayer` or the
 *    Google tag host at all. A tool that wants to report something cannot,
 *    because it has nowhere to report it to.
 * 2. The analytics module may import only from an allowed list, none of which
 *    is a tool or a tool's state, so there is nothing typed in scope for it to
 *    send even by accident.
 * 3. Every `gtag` call in that module is listed below, argument for argument.
 *    A new call, or a new argument on an existing one, fails this test until
 *    somebody adds it here — which is the moment to ask whether it is a page
 *    view.
 *
 * It is a guard against accident, not a security boundary: anyone with commit
 * access can edit this file too. Nobody can trip over it by mistake.
 */

/** Vitest runs from the repository root (see vitest.config.mts). */
const sourceRoot = join(process.cwd(), "src");

/** The one directory allowed to talk to Google Analytics. */
const ANALYTICS_DIR = join("components", "analytics");

/** The module that does it. */
const ANALYTICS_MODULE = join(ANALYTICS_DIR, "Analytics.tsx");

/**
 * Block and whole-line comments removed, so prose describing a forbidden call
 * — this repository's analytics module is full of it — is not mistaken for the
 * call itself. The same approach as `src/lib/no-math-random.test.ts`.
 */
export function codeOnly(contents: string): string {
  return contents.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Anything that is a route to Google Analytics, however it is spelled. */
const ANALYTICS_TOKENS = [/\bgtag\b/, /\bdataLayer\b/, /googletagmanager/];

/** Every shipped `.ts`/`.tsx` file under `src`; tests are not shipped. */
const shippedFiles = readdirSync(sourceRoot, {
  recursive: true,
  encoding: "utf8",
}).filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."));

const read = (file: string): string =>
  readFileSync(join(sourceRoot, file), "utf8");

/**
 * The argument list of every `gtag(...)` call in a piece of source, including
 * the calls written inside the inline bootstrap string, with whitespace
 * flattened so formatting cannot change the answer.
 */
export function gtagCallArguments(code: string): string[] {
  const calls: string[] = [];
  const opening = /\bgtag\s*(?:\?\.)?\s*\(/g;

  let match = opening.exec(code);

  while (match !== null) {
    const start = match.index + match[0].length;
    let index = start;
    let depth = 1;

    while (index < code.length && depth > 0) {
      const character = code[index];

      if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;

      index += 1;
    }

    calls.push(
      code
        .slice(start, index - 1)
        .replace(/\s+/g, " ")
        .trim(),
    );

    match = opening.exec(code);
  }

  return calls;
}

/**
 * Every `gtag` call the analytics module is allowed to make, written out.
 *
 * - the empty one is the queue function's own `function gtag()` declaration;
 * - `js` and `config` are the standard bootstrap, configured from a validated
 *   committed constant and a constant object — neither reads anything from the
 *   page;
 * - the one event is a page view, and its parameters come from `pageViewFor`,
 *   which is checked below to read only the router's path and the document
 *   title.
 */
const PERMITTED_GTAG_CALLS = [
  "",
  '"js", new Date()',
  '"config", measurementId, GA_CONFIG',
  '"event", PAGE_VIEW_EVENT, pageViewFor(pathname)',
];

/** What the analytics module may import. None of it is a tool. */
const PERMITTED_IMPORTS = [
  "next/navigation",
  "next/script",
  "react",
  "@/components/consent/ConsentProvider",
  "@/config/site",
];

const importsOf = (code: string): string[] =>
  [...code.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]!);

describe("the scan itself", () => {
  it("has files to scan, the analytics module among them", () => {
    expect(shippedFiles.length).toBeGreaterThan(20);
    expect(shippedFiles).toContain(ANALYTICS_MODULE);
    expect(shippedFiles).toContain(join("tools", "registry.ts"));
  });

  it("reads the arguments of every call, including ones inside a string", () => {
    expect(gtagCallArguments("gtag('event', 'page_view', { a: 1 });")).toEqual([
      "'event', 'page_view', { a: 1 }",
    ]);
    expect(gtagCallArguments("window.gtag?.('set', { user_id: id })")).toEqual([
      "'set', { user_id: id }",
    ]);
    expect(
      gtagCallArguments("const snippet = `gtag('js', new Date());`;"),
    ).toEqual(["'js', new Date()"]);
    expect(gtagCallArguments("nothing to see here")).toEqual([]);
  });

  it("would catch a call that carries what the visitor typed", () => {
    const smuggled = gtagCallArguments(
      "gtag('event', 'password_generated', { length: password.length });",
    );

    expect(smuggled).not.toEqual([]);
    expect(PERMITTED_GTAG_CALLS).not.toContain(smuggled[0]);
  });
});

describe("only the analytics module can reach Google Analytics", () => {
  it.each(
    shippedFiles.filter((file) => !file.startsWith(`${ANALYTICS_DIR}${sep}`)),
  )("%s mentions no analytics global", (file) => {
    const code = codeOnly(read(file));

    for (const token of ANALYTICS_TOKENS) {
      expect(
        token.test(code),
        `${file} refers to ${token.source}. Only src/components/analytics ` +
          `may talk to Google Analytics, and it may send page views only (REQ-11).`,
      ).toBe(false);
    }
  });
});

describe("the analytics module sends page views and nothing else", () => {
  const code = codeOnly(read(ANALYTICS_MODULE));

  it("makes only the calls listed here", () => {
    expect(gtagCallArguments(code).sort()).toEqual(
      [...PERMITTED_GTAG_CALLS].sort(),
    );
  });

  it("names exactly one event, and it is the page view", () => {
    // Call sites only: the trailing comma is what tells a real call from the
    // `command: "event", eventName: ...` of the type that constrains them.
    const events = [...code.matchAll(/"event",\s*([A-Za-z_]+)\s*,/g)].map(
      (match) => match[1],
    );

    expect(events).toEqual(["PAGE_VIEW_EVENT"]);
    expect(code).toContain('export const PAGE_VIEW_EVENT = "page_view"');
  });

  it("builds the page view from the path and the title alone", () => {
    expect(code).toMatch(
      /page_path:\s*pathname,\s*page_title:\s*document\.title/,
    );

    // No other parameter is ever attached to a page view.
    const parameterKeys = new Set(
      [...code.matchAll(/\bpage_[a-z_]+\b/g)].map((match) => match[0]),
    );
    expect([...parameterKeys].sort()).toEqual([
      "page_path",
      "page_title",
      "page_view",
    ]);
  });

  it("pushes nothing to the data layer but gtag's own arguments", () => {
    const pushes = [...code.matchAll(/dataLayer\s*\.\s*push\(([^)]*)\)/g)].map(
      (match) => match[1]!.trim(),
    );

    expect(pushes).toEqual(["arguments"]);
  });

  it("identifies nobody: no user id, no signals, no ad personalisation", () => {
    expect(code).not.toMatch(/user_id|client_id|custom_map|user_properties/);
    expect(code).toContain("allow_google_signals: false");
    expect(code).toContain("allow_ad_personalization_signals: false");
  });

  it("imports nothing that could hand it a tool's state", () => {
    expect(importsOf(code).sort()).toEqual([...PERMITTED_IMPORTS].sort());
  });

  it("names no tool, and no tool's input or output", () => {
    // Every word below is something a visitor typed or something generated
    // from it. None of them has any business in an analytics payload — and
    // since the module imports no tool, none of them can be in scope either.
    const forbidden =
      /password|clipboard|json|weight|temperature|celsius|kilogram|searchTerm|inputValue|generated/i;

    // `JSON.stringify` — the platform serializer, used to embed the committed
    // measurement ID safely in the inline snippet — is not the JSON tool.
    const withoutPlatformGlobals = code.replace(/\bJSON\b/g, "");

    expect(forbidden.test(withoutPlatformGlobals)).toBe(false);
  });
});
