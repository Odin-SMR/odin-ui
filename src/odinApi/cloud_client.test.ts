import { describe, expect, it } from "vitest";
import { schemas } from "./cloud_client";

const profile = {
  vmr: [1e-6, null, -2e-6], alt: [20000, 22000, 27000],
  meas_resp: [0.9, 0.5, 0.8], temp: [210, 205, 200], pressure: [100, 80, 50],
};

describe("Level 2 uncertainty response compatibility", () => {
  it("accepts existing responses without uncertainty fields", () => {
    expect(schemas.ProductData.parse(profile)).toEqual(profile);
  });

  it("retains source uncertainty values, null gaps, and exact row alignment", () => {
    const response = {
      ...profile, error_noise: [0, null, -1e-7], error_total: [1.23456789e-7, null, 2e-7],
    };
    expect(schemas.ProductData.parse(response)).toEqual(response);
  });

  it("accepts unavailable whole arrays but rejects nonnumeric error entries", () => {
    expect(schemas.ProductData.parse({ ...profile, error_noise: null, error_total: null }))
      .toEqual({ ...profile, error_noise: null, error_total: null });
    expect(schemas.ProductData.safeParse({ ...profile, error_total: ["missing"] }).success).toBe(false);
  });
});
