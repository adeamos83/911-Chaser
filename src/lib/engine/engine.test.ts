import { describe, expect, it } from "vitest";
import type { Listing } from "@/data/types";
import listingsJson from "@/data/listings.modeled.json";
import {
  dealScore,
  estimateBuild,
  fitCohort,
  mileageAdjust,
  optionPremium,
  paybackPct,
  premiumTable,
  priceByYear,
  tierFor,
} from "./index";

let n = 0;
function car(over: Partial<Listing> = {}): Listing {
  n++;
  return {
    id: `T${n}`,
    generation: "992.1",
    modelYear: 2022,
    trim: "Carrera S",
    body: "Coupe",
    transmission: "PDK",
    color: "Black",
    colorTier: "Standard",
    mileage: 15000,
    options: [],
    originalMsrp: 114000,
    price: 100000,
    status: "sold",
    date: "2026-01-01",
    ...over,
  };
}

describe("mileage regression", () => {
  it("recovers known per-mile and per-year slopes", () => {
    const rows: Listing[] = [];
    for (const year of [2020, 2021, 2022, 2023]) {
      for (const base of [5000, 15000, 30000, 45000]) {
        const miles = base + (year % 2) * 1000;
        rows.push(car({ modelYear: year, mileage: miles, price: 100000 - 0.4 * miles + 3000 * (year - 2020) }));
      }
    }
    const fit = fitCohort(rows);
    expect(fit.perMile).toBeCloseTo(-0.4, 6);
    expect(fit.perYear).toBeCloseTo(3000, 3);
  });

  it("normalizes every car to 15K miles", () => {
    const rows = [car({ mileage: 5000, price: 104000 }), car({ mileage: 25000, price: 96000 }), car({ mileage: 45000, price: 88000 })];
    const adj = mileageAdjust(rows);
    for (const a of adj) expect(a.adjustedPrice).toBeCloseTo(100000, 3);
  });
});

describe("option premium", () => {
  it("finds a planted effect", () => {
    const rows: Listing[] = [];
    for (let i = 0; i < 40; i++) {
      const has = i % 2 === 0;
      rows.push(car({ options: has ? ["SPORT_CHRONO"] : [], mileage: 10000 + i * 500, price: 100000 - 0.3 * (10000 + i * 500) + (has ? 4000 : 0) }));
    }
    const p = optionPremium(rows, "SPORT_CHRONO");
    expect(p.premiumUsd).toBeCloseTo(4000, -2);
    expect(p.confidence).not.toBe("low");
  });

  it("flags low confidence when either side has fewer than 5 cars", () => {
    const rows = [
      ...Array.from({ length: 10 }, () => car()),
      ...Array.from({ length: 3 }, () => car({ options: ["PCCB"], price: 102000 })),
    ];
    const p = optionPremium(rows, "PCCB");
    expect(p.sampleWith).toBe(3);
    expect(p.confidence).toBe("low");
  });
});

describe("payback tiers", () => {
  it("uses 80% and 30% boundaries", () => {
    expect(paybackPct(2160, 2700)).toBeCloseTo(0.8);
    expect(tierFor(0.8)).toBe("Value Holder");
    expect(tierFor(0.7999)).toBe("Neutral");
    expect(tierFor(0.3)).toBe("Neutral");
    expect(tierFor(0.2999)).toBe("Money Pit");
    expect(tierFor(-0.1)).toBe("Money Pit");
  });
});

describe("deal score", () => {
  const rows = Array.from({ length: 20 }, (_, i) => car({ mileage: 10000 + i * 1000, price: 100000 - 0.3 * (i * 1000) }));
  it("is positive when priced under market and negative when over", () => {
    expect(dealScore(car({ price: 85000 }), { listings: rows })).toBeGreaterThan(0);
    expect(dealScore(car({ price: 115000 }), { listings: rows })).toBeLessThan(0);
  });
});

describe("modeled dataset (planted effects)", () => {
  const listings = listingsJson as Listing[];
  const table = premiumTable(listings);
  it("shows Sport Chrono as a value holder and PCCB as a money pit", () => {
    expect(table.options.SPORT_CHRONO.tier).toBe("Value Holder");
    expect(table.options.PCCB.tier).toBe("Money Pit");
  });
  it("estimates a plausible range for a 992.1 Carrera S", () => {
    const est = estimateBuild(
      { generation: "992.1", trim: "Carrera S", body: "Coupe", transmission: "Manual", color: "Chalk", options: ["SPORT_CHRONO"] },
      { listings },
    )!;
    expect(est.low).toBeLessThan(est.mid);
    expect(est.mid).toBeLessThan(est.high);
    expect(est.mid).toBeGreaterThan(70000);
    expect(est.mid).toBeLessThan(140000);
  });
});

describe("price by model year", () => {
  it("takes the median per year and skips thin years", () => {
    const rows = [
      car({ modelYear: 2021, price: 100000 }),
      car({ modelYear: 2021, price: 110000 }),
      car({ modelYear: 2021, price: 300000 }),
      car({ modelYear: 2022, price: 120000 }),
    ];
    const other = car({ generation: "991.2", modelYear: 2021, price: 50000 });
    expect(priceByYear([...rows, other], { generation: "992.1", trim: "Carrera S" })).toEqual([{ year: 2021, medianPrice: 110000, sample: 3 }]);
  });
});
