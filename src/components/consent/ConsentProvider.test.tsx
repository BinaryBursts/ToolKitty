import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConsentProvider, useConsent } from "./ConsentProvider";

/** A probe that shows the answer and offers both ways to change it. */
function ConsentProbe() {
  const { consent, accept, decline } = useConsent();

  return (
    <div>
      <output>{consent}</output>
      <button type="button" onClick={accept}>
        Accept
      </button>
      <button type="button" onClick={decline}>
        Decline
      </button>
    </div>
  );
}

const answer = () => screen.getByRole("status").textContent;

describe("ConsentProvider", () => {
  it("starts unanswered on every mount", () => {
    render(
      <ConsentProvider>
        <ConsentProbe />
      </ConsentProvider>,
    );

    expect(answer()).toBe("unanswered");
  });

  it("records acceptance and refusal, and keeps them for the session", () => {
    const { rerender } = render(
      <ConsentProvider>
        <ConsentProbe />
      </ConsentProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(answer()).toBe("accepted");

    // Whatever else re-renders underneath, the answer stands.
    rerender(
      <ConsentProvider>
        <ConsentProbe />
      </ConsentProvider>,
    );
    expect(answer()).toBe("accepted");

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(answer()).toBe("declined");
  });

  it("forgets the answer when the tree is mounted again — a reload remembers nothing", () => {
    const first = render(
      <ConsentProvider>
        <ConsentProbe />
      </ConsentProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(answer()).toBe("accepted");
    first.unmount();

    render(
      <ConsentProvider>
        <ConsentProbe />
      </ConsentProvider>,
    );

    expect(answer()).toBe("unanswered");
  });

  it("writes no cookie and no storage entry, whichever answer is given", () => {
    const cookiesBefore = document.cookie;

    render(
      <ConsentProvider>
        <ConsentProbe />
      </ConsentProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(document.cookie).toBe(cookiesBefore);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("refuses to answer outside a provider rather than pretending nobody consented", () => {
    // React logs the thrown error as well as re-throwing it; the log is
    // silenced so a passing run stays readable.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ConsentProbe />)).toThrow(/ConsentProvider/);

    error.mockRestore();
  });
});

/**
 * The no-storage rule is the whole reason the banner comes back on every
 * visit (REQ-11), so it is checked against the source of these modules and
 * not only against their behaviour: a single `localStorage.setItem` added
 * later would pass every behavioural test above by making the banner *better*
 * behaved, and break the promise the privacy policy makes.
 */
describe("the consent modules touch no storage of any kind", () => {
  const directory = join(process.cwd(), "src", "components", "consent");

  const shipped = readdirSync(directory).filter(
    (file) => /\.tsx?$/.test(file) && !file.includes(".test."),
  );

  it("has both modules to scan", () => {
    expect(shipped).toContain("ConsentProvider.tsx");
    expect(shipped).toContain("ConsentBanner.tsx");
  });

  /** Comments stripped, as `no-math-random.test.ts` does, so prose naming a
      banned API is not mistaken for a use of it. */
  const codeOnly = (contents: string): string =>
    contents.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it.each(shipped)("%s holds the answer in memory alone", (file) => {
    const code = codeOnly(readFileSync(join(directory, file), "utf8"));

    expect(code).not.toMatch(/localStorage/);
    expect(code).not.toMatch(/sessionStorage/);
    expect(code).not.toMatch(/document\s*\.\s*cookie/);
    expect(code).not.toMatch(/indexedDB/);
  });
});
