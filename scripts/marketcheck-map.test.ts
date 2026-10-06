import { describe, expect, it } from "vitest";
import { colorFor, mapListing, mapOptions, trimFor } from "./marketcheck-map";

/** Builds a fake MarketCheck listing; pass overrides for top-level fields or for the build block. */
const rawListing = (overrides: Record<string, unknown> = {}, build: Record<string, unknown> = {}) => ({
  id: "x1",
  vin: "WP0TEST",
  price: 120000,
  miles: 20000,
  exterior_color: "Chalk",
  first_seen_at_date: "2026-09-01T00:00:00.000Z",
  ...overrides,
  build: { year: 2021, version: "Carrera S Coupe", transmission: "Manual", body_type: "Coupe", ...build },
});

describe("trimFor", () => {
  it("maps MarketCheck version strings onto our trims", () => {
    expect(trimFor("Carrera 4 GTS Coupe")).toBe("GTS");
    expect(trimFor("Targa 4S")).toBe("Carrera 4S");
    expect(trimFor("Turbo S Cabriolet")).toBe("Turbo S");
    expect(trimFor("Carrera T Coupe")).toBe("Carrera T");
    expect(trimFor("Targa 4")).toBe("Carrera");
  });

  it("excludes GT and limited-run cars", () => {
    for (const version of ["GT3", "GT3 RS", "GT2 RS", "Dakar", "Sport Classic", "Turbo 50 Years Coupe", "R"]) {
      expect(trimFor(version)).toBeNull();
    }
  });
});

describe("mapListing", () => {
  it("maps a normal listing", () => {
    const mapped = mapListing(rawListing())!;
    expect(mapped).toMatchObject({ generation: "992.1", trim: "Carrera S", body: "Coupe", transmission: "Manual", colorTier: "Special" });
    expect(mapped.originalMsrp).toBe(114000);
  });

  it("drops cars outside their model's production years", () => {
    expect(mapListing(rawListing({}, { year: 2013, version: "Turbo S Coupe" }))).toBeNull();
  });

  it("assigns generation from each model's own launch years", () => {
    expect(mapListing(rawListing({}, { year: 2025, version: "Carrera S Coupe" }))?.generation).toBe("992.1");
    expect(mapListing(rawListing({}, { year: 2026, version: "Carrera S Coupe" }))?.generation).toBe("992.2");
    expect(mapListing(rawListing({}, { year: 2025, version: "Carrera GTS Coupe" }))?.generation).toBe("992.2");
  });

  it("drops listings without price or mileage", () => {
    expect(mapListing(rawListing({ price: undefined }))).toBeNull();
    expect(mapListing(rawListing({ miles: undefined }))).toBeNull();
  });

  it("treats anything but Manual as PDK and Convertible as Cabriolet", () => {
    expect(mapListing(rawListing({}, { transmission: "Automatic", body_type: "Convertible", version: "Carrera S Cabriolet" }))).toMatchObject({
      transmission: "PDK",
      body: "Cabriolet",
    });
  });
});

describe("colorFor", () => {
  it("assigns paint tiers", () => {
    expect(colorFor("Miami Blue").colorTier).toBe("Special");
    expect(colorFor("GT Silver Metallic")).toEqual({ color: "GT Silver", colorTier: "Metallic" });
    expect(colorFor("Paint to Sample Mexico Blue").colorTier).toBe("PTS");
    expect(colorFor("Black").colorTier).toBe("Standard");
    expect(colorFor(undefined).color).toBe("Unknown");
  });
});

describe("mapOptions", () => {
  it("reads options from optional features and listing text", () => {
    const extra = {
      high_value_features: [
        { description: "4-Wheel Steering", type: "Optional" },
        { description: "Heated/Cooled Seats", type: "Standard" },
      ],
      seller_comments: "Sport Chrono Package, Porsche Ceramic Composite Brakes (PCCB), sunroof",
    };
    expect(mapOptions(extra, "Coupe").sort()).toEqual(["PCCB", "RAS", "SPORT_CHRONO", "SUNROOF"]);
    expect(mapOptions(extra, "Cabriolet")).not.toContain("SUNROOF");
  });
});
