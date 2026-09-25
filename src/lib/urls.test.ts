import { describe, expect, it } from "vitest";

import { SITE_BASE_URL } from "@/config/site";

import { absoluteUrl, toolPath, toolUrl } from "./urls";

describe("toolPath", () => {
  it("puts a tool at /tools/<slug>", () => {
    expect(toolPath("weight-converter")).toBe("/tools/weight-converter");
  });
});

describe("toolUrl", () => {
  it("builds the absolute URL from the site base URL and the slug", () => {
    expect(toolUrl("json-formatter")).toBe(
      `${SITE_BASE_URL}/tools/json-formatter`,
    );
  });

  it("never doubles the slash between the base URL and the path", () => {
    expect(toolUrl("password-generator")).not.toContain("//tools");
  });
});

describe("absoluteUrl", () => {
  it("joins a site-relative path onto the base URL", () => {
    expect(absoluteUrl("/about")).toBe(`${SITE_BASE_URL}/about`);
  });

  it("tolerates a path given without its leading slash", () => {
    expect(absoluteUrl("about")).toBe(`${SITE_BASE_URL}/about`);
  });
});
