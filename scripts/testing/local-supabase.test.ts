import { describe, expect, it } from "vitest";
import { assertLocalSupabase } from "./local-supabase";

describe("local Supabase test guard", () => {
  it.each([
    "http://127.0.0.1:54321",
    "http://localhost:54321/",
    "http://[::1]:54321",
  ])("allows loopback %s", (url) => {
    expect(() => assertLocalSupabase(url)).not.toThrow();
  });

  it.each([
    undefined,
    "",
    "not a URL",
    "https://project.supabase.co",
    "http://project.supabase.co",
    "http://localhost.supabase.co:54321",
    "http://127.0.0.1.example.com:54321",
    "http://localhost@project.supabase.co",
    "https://localhost:54321",
    "http://user:password@localhost:54321",
    "http://localhost:54321/proxy",
    "http://localhost:54321/?target=remote",
    "http://localhost:54321/#remote",
  ])("rejects unsafe or missing target %s", (url) => {
    expect(() => assertLocalSupabase(url)).toThrow(/Supabase tests/);
  });
});
