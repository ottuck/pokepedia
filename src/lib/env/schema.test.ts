import { describe, expect, it } from "vitest";
import { publicEnvSchema, serverEnvSchema } from "./schema";

const validPublic = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
};

describe("publicEnvSchema", () => {
  it("accepts a URL and a publishable key", () => {
    expect(publicEnvSchema.parse(validPublic)).toEqual(validPublic);
  });

  it("rejects missing values", () => {
    expect(publicEnvSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a legacy anon JWT in place of the publishable key", () => {
    const result = publicEnvSchema.safeParse({
      ...validPublic,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.x.y",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a secret key exposed as the public key", () => {
    const result = publicEnvSchema.safeParse({
      ...validPublic,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc",
    });
    expect(result.success).toBe(false);
  });
});

describe("serverEnvSchema", () => {
  it("accepts a secret key", () => {
    expect(
      serverEnvSchema.parse({ SUPABASE_SECRET_KEY: "sb_secret_abc" }),
    ).toEqual({
      SUPABASE_SECRET_KEY: "sb_secret_abc",
    });
  });

  it("rejects a publishable key in place of the secret key", () => {
    expect(
      serverEnvSchema.safeParse({ SUPABASE_SECRET_KEY: "sb_publishable_abc" })
        .success,
    ).toBe(false);
  });
});
