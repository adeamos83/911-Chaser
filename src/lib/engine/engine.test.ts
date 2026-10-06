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

/** Gives every test car a unique id. */
let carCount = 0;

/** A plain 992.1 Carrera S listing; pass only the fields a test cares about. */
function car(overrides: Partial<Listing> = {}): Listing {
  carCount++;
  return {
    id: `T${carCount}`,
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
    ...overrides,
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
    const adjusted = mileageAdjust(rows);
    for (const listing of adjusted) expect(listing.adjustedPrice).toBeCloseTo(100000, 3);
  });
});

describe("option premium", () => {
  it("finds a planted effect", () => {
    const rows: Listing[] = [];
    for (let i = 0; i < 40; i++) {
      const hasOption = i % 2 === 0;
      const mileage = 10000 + i * 500;
      const optionBump = hasOption ? 4000 : 0;
      const price = 100000 - 0.3 * mileage + optionBump;
      rows.push(car({ options: hasOption ? ["SPORT_CHRONO"] : [], mileage, price }));
    }
    const premium = optionPremium(rows, "SPORT_CHRONO");
    expect(premium.premiumUsd).toBeCloseTo(4000, -2);
    expect(premium.confidence).not.toBe("low");
  });

  it("flags low confidence when either side has fewer than 5 cars", () => {
    const rows = [
      ...Array.from({ length: 10 }, () => car()),
      ...Array.from({ length: 3 }, () => car({ options: ["PCCB"], price: 102000 })),
    ];
    const premium = optionPremium(rows, "PCCB");
    expect(premium.sampleWith).toBe(3);
    expect(premium.confidence).toBe("low");
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
    const estimate = estimateBuild(
      { generation: "992.1", trim: "Carrera S", body: "Coupe", transmission: "Manual", color: "Chalk", options: ["SPORT_CHRONO"] },
      { listings },
    )!;
    expect(estimate.low).toBeLessThan(estimate.mid);
    expect(estimate.mid).toBeLessThan(estimate.high);
    expect(estimate.mid).toBeGreaterThan(70000);
    expect(estimate.mid).toBeLessThan(140000);
  });
  it("breaks the estimate into parts that add up to the middle price", () => {
    const estimate = estimateBuild(
      { generation: "992.1", trim: "Carrera S", body: "Coupe", transmission: "Manual", color: "Chalk", options: ["SPORT_CHRONO"] },
      { listings },
      { mileage: 30000, modelYear: 2021 },
    )!;
    const parts = estimate.breakdown;
    const partsTotal = parts.bareCar + parts.modelYear + parts.mileage + parts.paint + parts.transmission + parts.options;
    expect(partsTotal).toBeCloseTo(estimate.mid, 6);
    expect(estimate.modelYear).toBe(2021);
    expect(estimate.mileage).toBe(30000);
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
