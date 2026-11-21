import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    }
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: "Raw <button> is prohibited outside components/ui. Use Button or IconButton from '@/components/ui' instead."
        },
        {
          selector: "JSXOpeningElement[name.name='input']",
          message: "Raw <input> is prohibited outside components/ui. Use Input, PhoneInput, or PasswordInput from '@/components/ui' instead."
        },
        {
          selector: "JSXOpeningElement[name.name='select']",
          message: "Raw <select> is prohibited outside components/ui. Use Select from '@/components/ui' instead."
        },
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message: "Raw <textarea> is prohibited outside components/ui. Use Input with multiline from '@/components/ui' instead."
        }
      ]
    }
  }
]);

export default eslintConfig;
