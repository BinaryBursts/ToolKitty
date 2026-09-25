import { TOOL_CATEGORIES } from "./categories";
import { JsonFormatter } from "./json-formatter/JsonFormatter";
import { PasswordGenerator } from "./password-generator/PasswordGenerator";
import { TemperatureConverter } from "./temperature-converter/TemperatureConverter";
import type { ToolCategory, ToolDefinition, ToolsByCategory } from "./types";
import { validateTools } from "./validate";
import { WeightConverter } from "./weight-converter/WeightConverter";

/**
 * The tool registry: one entry per tool, and the only place a tool is declared
 * (REQ-2).
 *
 * Everything else on the site reads this — the page at `/tools/<slug>`,
 * navigation, the homepage directory, tool search, the sitemap, each page's
 * title and meta tags, the privacy notice and the ad slot. **Adding a tool is a
 * component file plus one entry here, and nothing else.**
 *
 * Two rules the build enforces (see `./validate.ts`):
 *
 * 1. Slugs are lower-case words joined by hyphens, and unique.
 * 2. A published slug is permanent. Renaming a tool means changing `name`, never
 *    `slug`; `published-slugs.lock.json` and its test hold the site to that.
 */
const TOOLS: readonly ToolDefinition[] = [
  {
    slug: "weight-converter",
    name: "Weight Converter",
    shortDescription:
      "Convert between kilograms, pounds, ounces, grams, stones and tonnes.",
    category: "converters",
    keywords: [
      "weight",
      "mass",
      "unit",
      "kilograms",
      "kg",
      "pounds",
      "lb",
      "lbs",
      "ounces",
      "oz",
      "grams",
      "stones",
      "tonnes",
      "metric",
      "imperial",
      "kg to lbs",
    ],
    seoTitle: "Weight Converter — kg, lb, oz, g and stones | ToolKitty",
    metaDescription:
      "Free weight converter: kilograms, pounds, ounces, grams, stones and tonnes, converted as you type. Runs entirely in your browser.",
    featured: true,
    component: WeightConverter,
    supportingCopy: [
      "Type a value, pick the unit you have and the unit you want, and the result appears as you type. Every one of the nine supported units converts to every other, so you can go from grams to stones or from tonnes to ounces without a second step.",
      "The conversion happens in your browser using exact unit factors — there is no rounding beyond what is shown, and nothing you type is sent anywhere.",
    ],
  },
  {
    slug: "temperature-converter",
    name: "Temperature Converter",
    shortDescription: "Convert between Celsius, Fahrenheit and Kelvin.",
    category: "converters",
    keywords: [
      "temperature",
      "celsius",
      "centigrade",
      "fahrenheit",
      "kelvin",
      "degrees",
      "c to f",
      "f to c",
      "weather",
      "oven",
    ],
    seoTitle:
      "Temperature Converter — Celsius, Fahrenheit and Kelvin | ToolKitty",
    metaDescription:
      "Free temperature converter for Celsius, Fahrenheit and Kelvin. Convert as you type, with no sign-up and nothing leaving your browser.",
    featured: true,
    component: TemperatureConverter,
    supportingCopy: [
      "Enter a temperature and read it back in the other two scales at once — useful for recipes written for another country's oven, for weather forecasts, and for schoolwork.",
      "Conversions are exact: Celsius to Fahrenheit multiplies by 9/5 and adds 32, and Kelvin is Celsius plus 273.15.",
    ],
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    shortDescription:
      "Generate a strong random password, with the length and character types you choose.",
    category: "generators-formatters",
    keywords: [
      "password",
      "passphrase",
      "random",
      "generator",
      "strong",
      "secure",
      "symbols",
      "numbers",
      "uppercase",
      "lowercase",
      "length",
    ],
    seoTitle: "Password Generator — strong random passwords | ToolKitty",
    metaDescription:
      "Generate strong random passwords in your browser. Choose the length and which character types to include, then copy. No password is ever sent or stored.",
    featured: true,
    component: PasswordGenerator,
    supportingCopy: [
      "Choose how long the password should be and which character types to draw on — lower case, upper case, digits and symbols — then generate and copy it.",
      "Randomness comes from your browser's cryptographic random number generator. The password is created on your device, is never transmitted, and is not saved anywhere once you leave the page.",
    ],
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    shortDescription:
      "Beautify and indent JSON, with a clear message when it will not parse.",
    category: "generators-formatters",
    keywords: [
      "json",
      "format",
      "formatter",
      "beautify",
      "beautifier",
      "pretty print",
      "prettify",
      "indent",
      "validate",
      "validator",
      "api",
    ],
    seoTitle: "JSON Formatter — beautify and check JSON online | ToolKitty",
    metaDescription:
      "Paste JSON and get it indented and readable, or a plain explanation of why it will not parse. Formatting happens in your browser — your data stays with you.",
    featured: true,
    component: JsonFormatter,
    supportingCopy: [
      "Paste JSON — a minified API response, a config file, a log line — and read it back indented and readable. If it will not parse, you get a message saying what went wrong and where, rather than a bare failure.",
      "This is the right tool to reach for with data you would rather not paste into a website: the formatting runs in your browser, so the JSON never leaves your device.",
    ],
  },
];

// Runs when this module is first imported — which, because every tool page,
// the directory, the search index and the sitemap import it, means it runs
// during `npm run build`. A registry mistake fails the build here (REQ-2).
validateTools(TOOLS);

/** Every registered tool, in registry order. */
export const getAllTools = (): readonly ToolDefinition[] => TOOLS;

/** The tool with this slug, or `undefined` when no tool has it. */
export const getToolBySlug = (slug: string): ToolDefinition | undefined =>
  TOOLS.find((tool) => tool.slug === slug);

/**
 * Group any set of tools under any set of categories: categories ascending by
 * `order`, tools in the order given within each, and a category with no tools
 * left out entirely so the directory never renders an empty heading.
 *
 * Exported so the grouping rules can be tested against category sets the live
 * registry does not happen to produce — an empty category, in particular.
 */
export const groupToolsByCategory = (
  tools: readonly ToolDefinition[],
  categories: readonly ToolCategory[] = TOOL_CATEGORIES,
): readonly ToolsByCategory[] =>
  [...categories]
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      tools: tools.filter((tool) => tool.category === category.id),
    }))
    .filter((group) => group.tools.length > 0);

/**
 * Tools grouped for the homepage directory: categories in their defined order,
 * tools in registry order within each, and categories with no tools left out.
 */
export const getToolsByCategory = (): readonly ToolsByCategory[] =>
  groupToolsByCategory(TOOLS, TOOL_CATEGORIES);

/** The featured tools, in registry order. */
export const getFeaturedTools = (): readonly ToolDefinition[] =>
  TOOLS.filter((tool) => tool.featured);
