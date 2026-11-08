import { describe, expect, it } from "vitest";
import { productFormSchema } from "./product.schema";

describe("productFormSchema", () => {
  it("accepts numeric cost/price and a valid uuid category", () => {
    const result = productFormSchema.safeParse({
      name: "Widget",
      sku: "W-1",
      cost: 12.34,
      price: 20,
      stock: 5,
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cost).toBe(12.34);
      expect(result.data.price).toBe(20);
    }
  });

  it("rejects negative money", () => {
    const result = productFormSchema.safeParse({
      name: "Widget",
      sku: "W-1",
      cost: -1,
      price: 20,
      stock: 0,
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a blank name", () => {
    const result = productFormSchema.safeParse({
      name: "   ",
      sku: "W-1",
      cost: 1,
      price: 2,
      stock: 0,
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(false);
  });
});
