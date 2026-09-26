import { describe, expect, it } from "vitest";

import {
  GA_MEASUREMENT_ID,
  GA_MEASUREMENT_ID_PATTERN,
  isAnalyticsEnabled,
} from "./site";

/**
 * The committed Google Analytics measurement ID (REQ-11).
 *
 * It is public, so it lives in source control rather than in an environment
 * variable — but it is also pasted in by hand, and a typo in it is invisible:
 * the site would keep working and simply measure nothing, for as long as it
 * took somebody to notice the empty reports. So the value that is committed is
 * checked here, and CI fails on anything that is neither "not configured yet"
 * nor a well-formed ID.
 */
describe("the Google Analytics measurement ID", () => {
  it("is either empty or a well-formed GA4 ID", () => {
    expect(
      GA_MEASUREMENT_ID === "" ||
        GA_MEASUREMENT_ID_PATTERN.test(GA_MEASUREMENT_ID),
      `GA_MEASUREMENT_ID is ${JSON.stringify(GA_MEASUREMENT_ID)}, which is ` +
        `neither empty nor of the form G-XXXXXXXXXX. See the Analytics ` +
        `section of the README.`,
    ).toBe(true);
  });

  it("is not a placeholder that would look configured", () => {
    // The shape check above would happily pass the example from the docs.
    expect(GA_MEASUREMENT_ID).not.toBe("G-XXXXXXXXXX");
    expect(GA_MEASUREMENT_ID.toUpperCase()).not.toContain("TODO");
  });

  it("switches analytics on only for a usable ID", () => {
    expect(isAnalyticsEnabled()).toBe(
      GA_MEASUREMENT_ID_PATTERN.test(GA_MEASUREMENT_ID),
    );
  });
});

describe("the shape a measurement ID must have", () => {
  it.each(["G-ABCD123456", "G-1A2B3C4D5E", "G-abcd1234"])(
    "accepts %s",
    (id) => {
      expect(GA_MEASUREMENT_ID_PATTERN.test(id)).toBe(true);
    },
  );

  it.each([
    "",
    "G-",
    "G-12",
    "not-an-id",
    "UA-123456-1",
    "GTM-ABCD123",
    " G-ABCD123456",
    "G-ABCD123456 ",
    "G-ABCD 123456",
    'G-1"></script><script>alert(1)</script>',
    "G-ABCD123456?id=other",
  ])("rejects %j", (id) => {
    expect(GA_MEASUREMENT_ID_PATTERN.test(id)).toBe(false);
  });
});
