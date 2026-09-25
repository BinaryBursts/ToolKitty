import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Formatting is Prettier's job; switch off the rules that would fight it.
  prettier,
  {
    // Application code: src/app, src/components, src/lib, src/tools, src/config.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // ToolKitty has no backend and no secrets, so no application file may
      // read configuration from the environment (REQ-1). Public constants live
      // in src/config/site.ts instead.
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "ToolKitty is a static, client-only site: use committed constants in src/config/site.ts instead of process.env.",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
