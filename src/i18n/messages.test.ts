import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const catalogs = { ko, en, ja };

describe("message catalogs", () => {
  // ko.json is the type source (src/global.d.ts), so every other locale must match it exactly.
  it.each(["en", "ja"] as const)("%s has the same keys as ko", (locale) => {
    expect(keyPaths(catalogs[locale]).sort()).toEqual(keyPaths(ko).sort());
  });

  it.each(Object.entries(catalogs))("%s has no empty strings", (_, catalog) => {
    const flat = JSON.stringify(catalog);
    expect(flat).not.toContain('""');
  });
});
