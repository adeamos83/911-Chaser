import { describe, expect, it } from "vitest";
import { colorFor, mapListing, mapOptions, trimFor } from "./marketcheck-map";

const raw = (over: Record<string, unknown> = {}, build: Record<string, unknown> = {}) => ({
  id: "x1",
  vin: "WP0TEST",
  price: 120000,
  miles: 20000,
  exterior_color: "Chalk",
  first_seen_at_date: "2026-09-01T00:00:00.000Z",
  ...over,
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
    for (const v of ["GT3", "GT3 RS", "GT2 RS", "Dakar", "Sport Classic", "Turbo 50 Years Coupe", "R"]) {
      expect(trimFor(v)).toBeNull();
    }
  });
});

describe("mapListing", () => {
  it("maps a normal listing", () => {
    const m = mapListing(raw())!;
    expect(m).toMatchObject({ generation: "992.1", trim: "Carrera S", body: "Coupe", transmission: "Manual", colorTier: "Special" });
    expect(m.originalMsrp).toBe(114000);
  });

  it("drops cars outside their model's production years", () => {
    expect(mapListing(raw({}, { year: 2013, version: "Turbo S Coupe" }))).toBeNull();
  });

  it("drops listings without price or mileage", () => {
    expect(mapListing(raw({ price: undefined }))).toBeNull();
    expect(mapListing(raw({ miles: undefined }))).toBeNull();
  });

  it("treats anything but Manual as PDK and Convertible as Cabriolet", () => {
    expect(mapListing(raw({}, { transmission: "Automatic", body_type: "Convertible", version: "Carrera S Cabriolet" }))).toMatchObject({
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
