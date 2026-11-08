import { describe, expect, it } from "vitest";
import { loginSchema } from "./login.schema";

describe("loginSchema", () => {
  it("trims and lowercases the email", () => {
    const result = loginSchema.safeParse({
      email: "  ADMIN@STORE.LOCAL  ",
      password: "admin123",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("admin@store.local");
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "admin@store.local", password: "" });
    expect(result.success).toBe(false);
  });
});
