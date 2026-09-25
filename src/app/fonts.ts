import { DM_Mono, Manrope, Outfit } from "next/font/google";

/**
 * The approved design's three typefaces, self-hosted by `next/font`.
 *
 * `next/font/google` downloads the font files at build time and emits them as
 * static assets next to the rest of the export, so a visitor's browser never
 * makes a request to fonts.googleapis.com or fonts.gstatic.com. That is what
 * keeps the "no third-party request" promise true on every shell page.
 *
 * Each font is exposed as a CSS custom property rather than a class, because
 * the theme stylesheet in globals.css picks the family per element.
 */

/** Headings and other display type. */
export const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

/** Body copy. */
export const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

/** Monospace: URLs, generated passwords, formatted JSON. */
export const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-mono",
});

/** All three font variables, for the `<html>` element's class list. */
export const fontVariables = `${outfit.variable} ${manrope.variable} ${dmMono.variable}`;
