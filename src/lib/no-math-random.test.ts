import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * REQ-7: the password generator's randomness comes from the Web Crypto API, and
 * the standard library's non-cryptographic generator must not be used anywhere
 * in generation. A password built on it would look random and be guessable, and
 * the mistake is the kind that arrives in an unrelated change months later —
 * so the ban is enforced by the build rather than by review.
 *
 * This scans every place the tool's code can live: `src/lib`, which holds the
 * generation module, `src/tools`, which holds the tool components, and
 * `src/components`, where a shared control for the password screen would go.
 * Nothing under them is exempt — an exemption is exactly the crack the mistake
 * would come through. Comments are stripped first, as `add-a-tool.test.tsx`
 * does, so prose naming the banned call — this module's own documentation does
 * — is not mistaken for a use of it. Test files are skipped: they are not
 * shipped, and this one has to be able to describe what it forbids.
 *
 * It is a guard against accident, not a security boundary: unusual formatting
 * (`globalThis["Ma" + "th"]["random"]`, say) would slip past it. Anyone with
 * commit access can defeat it; nobody can trip over it by mistake.
 */

/**
 * The banned call, assembled rather than written out, so this file contains no
 * literal the scan below could ever catch.
 */
const BANNED_OBJECT = "Math";
const BANNED_METHOD = "random";
const BANNED_CALL = `${BANNED_OBJECT}.${BANNED_METHOD}`;

/** Matches the banned call however it is spaced: `Math . random` counts. */
const BANNED_PATTERN = new RegExp(
  `\\b${BANNED_OBJECT}\\s*\\.\\s*${BANNED_METHOD}\\b`,
);

/**
 * Block and whole-line comments removed. Line comments are only stripped where
 * they start a line, so a `//` inside a string literal is left alone.
 */
export function codeOnly(contents: string): string {
  return contents.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Does this source file call the banned generator? */
export function usesBannedRandom(contents: string): boolean {
  return BANNED_PATTERN.test(codeOnly(contents));
}

// Vitest runs from the repository root (see vitest.config.mts).
const sourceRoot = join(process.cwd(), "src");

/** Every shipped `.ts`/`.tsx` file under the scanned directories. */
const files = ["lib", "tools", "components"].flatMap((directory) =>
  readdirSync(join(sourceRoot, directory), {
    recursive: true,
    encoding: "utf8",
  })
    .map((entry) => join(directory, entry))
    .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test.")),
);

describe("the scan itself", () => {
  it("has files to scan, the generation module among them", () => {
    // A guard on the guard: an empty list would pass every check below, and a
    // filter that quietly stopped matching would be invisible without this.
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(join("lib", "password.ts"));
    expect(files).toContain(join("tools", "registry.ts"));
    expect(files.some((file) => file.startsWith(`components${sep}`))).toBe(
      true,
    );
  });

  it("fails a module that calls the banned generator", () => {
    expect(usesBannedRandom(`const index = ${BANNED_CALL}() * 10;`)).toBe(true);
    expect(
      usesBannedRandom(`const index = ${BANNED_OBJECT} . ${BANNED_METHOD}();`),
    ).toBe(true);
    expect(
      usesBannedRandom(
        `function pick() {\n  return Math.floor(${BANNED_CALL}());\n}\n`,
      ),
    ).toBe(true);
  });

  it("passes the same module once the call is removed", () => {
    expect(usesBannedRandom("const index = randomInt(10);")).toBe(false);
    expect(usesBannedRandom("const index = Math.floor(word / 10);")).toBe(
      false,
    );
  });

  it("ignores the call named in prose, and sees it in code", () => {
    expect(usesBannedRandom(`// never use ${BANNED_CALL} here\n`)).toBe(false);
    expect(usesBannedRandom(`/** not ${BANNED_CALL}, ever */\n`)).toBe(false);
    expect(
      usesBannedRandom(
        `/** not ${BANNED_CALL}, ever */\nconst x = ${BANNED_CALL}();\n`,
      ),
    ).toBe(true);
  });
});

describe("no shipped module under src/lib, src/tools or src/components calls the banned generator", () => {
  it.each(files)(
    "%s uses the Web Crypto API or no randomness at all",
    (file) => {
      const contents = readFileSync(join(sourceRoot, file), "utf8");

      expect(
        usesBannedRandom(contents),
        `${file} calls ${BANNED_CALL}. Randomness on ToolKitty comes from ` +
          `crypto.getRandomValues (REQ-7): use randomInt from src/lib/password.ts.`,
      ).toBe(false);
    },
  );
});
