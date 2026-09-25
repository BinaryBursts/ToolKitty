import { describe, expect, it } from "vitest";

import { cx } from "./classNames";

describe("cx", () => {
  it("joins the class names it is given", () => {
    expect(cx("o-btn", "o-btn--primary")).toBe("o-btn o-btn--primary");
  });

  it("drops anything falsy so conditions can be written inline", () => {
    expect(cx("o-input", false && "o-input--error", undefined, null)).toBe(
      "o-input",
    );
  });

  it("returns an empty string when nothing survives", () => {
    expect(cx(undefined, false)).toBe("");
  });
});
