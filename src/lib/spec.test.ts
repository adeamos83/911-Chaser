import { describe, expect, it } from "vitest";
import { DEFAULT_SPEC, configuratorLink, editBuildIdFromParams, normalizeSpec } from "./spec";

describe("normalizeSpec seat options", () => {
  it("keeps the seat picked last when two kinds of seat are requested", () => {
    expect(normalizeSpec({ ...DEFAULT_SPEC, options: ["ASS_PLUS", "BUCKETS"] }).options).toEqual(["BUCKETS"]);
    expect(normalizeSpec({ ...DEFAULT_SPEC, options: ["BUCKETS", "ASS_PLUS"] }).options).toEqual(["ASS_PLUS"]);
  });

  it("drops ventilation when bucket seats are picked after it, and the buckets when ventilation comes later", () => {
    expect(normalizeSpec({ ...DEFAULT_SPEC, options: ["VENT_SEATS", "BUCKETS"] }).options).toEqual(["BUCKETS"]);
    expect(normalizeSpec({ ...DEFAULT_SPEC, options: ["BUCKETS", "VENT_SEATS"] }).options).toEqual(["VENT_SEATS"]);
  });

  it("allows ventilation with adaptive sport seats", () => {
    expect(normalizeSpec({ ...DEFAULT_SPEC, options: ["ASS_PLUS", "VENT_SEATS"] }).options).toEqual(["ASS_PLUS", "VENT_SEATS"]);
  });
});

describe("configuratorLink edit id", () => {
  it("round-trips the saved build id", () => {
    const query = new URLSearchParams(configuratorLink(DEFAULT_SPEC, {}, "abc-123").split("?")[1]);
    expect(editBuildIdFromParams(Object.fromEntries(query))).toBe("abc-123");
    expect(editBuildIdFromParams({})).toBeUndefined();
  });
});
