import { describe, expect, it } from "vitest";
import { OPTIONS } from "./catalog";
import { FACTORY_CODES, optionsFromFactoryCodes } from "./factoryCodes";

describe("optionsFromFactoryCodes", () => {
  it("turns factory codes into our option names", () => {
    const options = optionsFromFactoryCodes(["8LH", "0N5", "9VL"], "992.1");
    expect(options.sort()).toEqual(["RAS", "SPORT_CHRONO"]);
  });

  it("only uses codes that are valid for the car's generation", () => {
    // 640 is Sport Chrono on a 991, but means nothing on a 992.
    expect(optionsFromFactoryCodes(["640"], "991.2")).toEqual(["SPORT_CHRONO"]);
    expect(optionsFromFactoryCodes(["640"], "992.1")).toEqual([]);
  });

  it("returns each option once, even if the car has two codes for it", () => {
    expect(optionsFromFactoryCodes(["3FD", "3FE"], "992.2")).toEqual(["SUNROOF"]);
  });

  it("ignores codes we don't know", () => {
    expect(optionsFromFactoryCodes(["ZZZ", "LTH"], "992.1")).toEqual([]);
  });
});

describe("FACTORY_CODES table", () => {
  it("only points at options that exist in the catalog", () => {
    const knownOptions = new Set(OPTIONS.map((option) => option.code));
    for (const row of FACTORY_CODES) {
      expect(knownOptions.has(row.option)).toBe(true);
    }
  });
});
