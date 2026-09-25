import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ToolPage, { generateStaticParams } from "@/app/tools/[slug]/page";
import { CHARACTER_SETS, PASSWORD_MIN_LENGTH } from "@/lib/password";

/**
 * The password generator has no page file of its own: the shared tool template
 * builds `/tools/password-generator` from its registry entry (REQ-2). This
 * checks the route the static export actually writes — the tool rendered
 * inside the template, as HTML.
 *
 * The point of most of it is what the HTML must **not** contain. The page is
 * statically exported, so whatever is rendered on the server ends up in a file
 * served to every visitor; a password generated during render would be that
 * file's contents, shared by everybody, which would make nonsense of REQ-7.
 * Generation therefore happens in a mount effect, and the checks below are
 * what would catch it moving back into render.
 *
 * The last test reads the export in `out/`, which only exists after
 * `npm run build`. It is skipped when **the export as a whole** has not been
 * run — not when this one file is missing, which is precisely the failure it
 * is here to catch.
 */

const SLUG = "password-generator";

const exportDir = join(process.cwd(), "out");
const exportedPage = join(exportDir, "tools", `${SLUG}.html`);

/** Render the route exactly as the static export does: params in, element out. */
const renderRoute = async (): Promise<ReactElement> =>
  (await ToolPage({
    params: Promise.resolve({ slug: SLUG }),
    searchParams: Promise.resolve({}),
  })) as ReactElement;

/** Every character a generated password can be made of. */
const PASSWORD_ALPHABET = Object.values(CHARACTER_SETS).join("");

/**
 * Every word in the page's visible text that has the shape of a password this
 * tool makes: no spaces, at least {@link PASSWORD_MIN_LENGTH} characters, all
 * of them from the password alphabet, and at least one from each of the four
 * classes — which is what a default generation produces and what no phrase in
 * the page's prose is.
 *
 * Tags are stripped first, so a class name, an inline style or an SVG path is
 * not mistaken for a password.
 */
export function passwordShapedWords(markup: string): string[] {
  const text = markup.replace(/<[^>]*>/g, " ");

  return text
    .split(/\s+/)
    .filter(
      (word) =>
        word.length >= PASSWORD_MIN_LENGTH &&
        Array.from(word).every((character) =>
          PASSWORD_ALPHABET.includes(character),
        ) &&
        Object.values(CHARACTER_SETS).every((set) =>
          Array.from(word).some((character) => set.includes(character)),
        ),
    );
}

/** The text inside the readout — where a password would be if there were one. */
function readoutValue(markup: string): string {
  const match = /class="t-readout__value[^"]*">([\s\S]*?)<\/div>/.exec(markup);

  return match?.[1] ?? "";
}

describe("/tools/password-generator", () => {
  it("is one of the routes the static export builds", () => {
    expect(generateStaticParams()).toContainEqual({ slug: SLUG });
  });

  it("renders the tool inside the shared template", async () => {
    const markup = renderToStaticMarkup(await renderRoute());

    // The template's own sections, in the order it fixes them in.
    expect(
      [...markup.matchAll(/data-section="([a-z-]+)"/g)].map(
        (match) => match[1],
      ),
    ).toEqual([
      "intro",
      "tool",
      "privacy",
      "supporting-copy",
      "more-tools",
      "ad-reserve",
    ]);

    // ...with this tool's controls inside it.
    expect(markup).toContain("Length");
    expect(markup).toContain("Character types");
    expect(markup).toContain("Copy password");
    expect(markup).toContain("Generate again");
  });

  it("carries no password in the HTML it renders", async () => {
    const markup = renderToStaticMarkup(await renderRoute());

    // The readout holds its placeholder: the password is made in the browser
    // on mount, so there is nothing here to ship.
    expect(readoutValue(markup)).toContain("—");
    expect(passwordShapedWords(markup)).toEqual([]);
  });

  it("would notice a password if one were rendered", () => {
    // A guard on the guard: the scan above passes trivially if it stops
    // matching, so it is shown here catching the thing it exists to catch.
    expect(passwordShapedWords("<div>qR7!vTm2%eXk9Zda</div>")).toEqual([
      "qR7!vTm2%eXk9Zda",
    ]);
    expect(passwordShapedWords(CHARACTER_SETS.uppercase)).toEqual([]);
  });

  it.skipIf(!existsSync(exportDir))(
    "is written to out/tools/password-generator.html with no password in it",
    () => {
      // The build ran, so this route must be among what it wrote.
      expect(existsSync(exportedPage)).toBe(true);

      const html = readFileSync(exportedPage, "utf8");

      expect(html).toContain("Character types");
      expect(html).toContain("Copy password");
      // The tool is inside the shared template, not a page of its own.
      expect(html).toContain('data-section="tool"');

      // ...and the file every visitor downloads holds no password. Only the
      // page's own body is scanned: the scripts Next.js links carry minified
      // code and hashes that look like anything at all.
      const body = html.slice(
        html.indexOf('data-section="tool"'),
        html.indexOf('data-section="privacy"'),
      );

      expect(readoutValue(body)).toContain("—");
      expect(passwordShapedWords(body)).toEqual([]);
    },
  );
});
