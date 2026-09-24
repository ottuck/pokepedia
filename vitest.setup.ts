import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom does not implement layout APIs.
Element.prototype.scrollIntoView ??= () => {};

// next/font loaders only work through the Next compiler; in tests a font is just class names.
// vi.mock is hoisted above imports, but its factory runs lazily, after this line.
const font = () => ({ className: "", variable: "", style: { fontFamily: "" } });
vi.mock("next/font/local", () => ({ default: font }));
vi.mock("next/font/google", () => ({
  DotGothic16: font,
  Noto_Sans_JP: font,
  Noto_Sans_KR: font,
}));
