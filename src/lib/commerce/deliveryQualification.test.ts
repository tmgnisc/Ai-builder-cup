import { describe, expect, it } from "vitest";
import { qualifyDelivery } from "./deliveryQualification";

describe("deliveryQualification", () => {
  it("qualifies for free delivery inside Kathmandu valley when amount meets threshold (NPR 5,000)", () => {
    const res = qualifyDelivery(5000, "Kathmandu");
    expect(res.zone).toBe("valley");
    expect(res.qualifiesForFree).toBe(true);
    expect(res.effectiveFee).toBe(0);
    expect(res.remainingForFree).toBe(0);
    expect(res.formattedSummary).toContain("Free delivery to Kathmandu");
  });

  it("calculates remaining amount and standard fee when amount is under valley threshold", () => {
    const res = qualifyDelivery(3200, "Lalitpur");
    expect(res.zone).toBe("valley");
    expect(res.qualifiesForFree).toBe(false);
    expect(res.effectiveFee).toBe(100);
    expect(res.remainingForFree).toBe(1800);
    expect(res.formattedSummary).toContain("NPR 100 delivery to Lalitpur");
    expect(res.formattedSummary).toContain("Free over NPR 5,000");
  });

  it("applies outside valley rules (NPR 250 fee, free over NPR 50,000) for outside cities", () => {
    const res = qualifyDelivery(25000, "Pokhara");
    expect(res.zone).toBe("outside");
    expect(res.qualifiesForFree).toBe(false);
    expect(res.effectiveFee).toBe(250);
    expect(res.remainingForFree).toBe(25000);
    expect(res.days).toBe("3–5 days");
  });

  it("qualifies for free shipping outside valley when amount exceeds NPR 50,000", () => {
    const res = qualifyDelivery(60000, "Biratnagar");
    expect(res.zone).toBe("outside");
    expect(res.qualifiesForFree).toBe(true);
    expect(res.effectiveFee).toBe(0);
    expect(res.remainingForFree).toBe(0);
  });
});
