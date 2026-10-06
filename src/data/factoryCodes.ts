/**
 * Porsche factory option codes, and which of our options each one means.
 *
 * MarketCheck gives each car a list of factory codes (like "8LH" or "640") from its build data.
 * This table turns those codes into the option names the app uses (like "SPORT_CHRONO").
 *
 * The same option can have a different code in each generation, so every row says which
 * generations it applies to. Every code here comes from a published source (listed below).
 * Codes we could not confirm are left out on purpose.
 *
 * Important: MarketCheck's code lists are incomplete. A car with a code really has the option,
 * but a car without the code might still have it. That's why the pull also checks the dealer's text.
 */
import type { Generation } from "./types";

/** Where the codes came from. */
export const FACTORY_CODE_SOURCES = {
  list991_1: "http://plenums.blogspot.com/2017/01/porsche-911-9911-option-codes-my-2012.html",
  list991_2: "https://www.carrerafever.net/porsche-911-991-2-option-codes-my2017/",
  list992_1: "https://www.carrerafever.net/porsche-911-992-1-option-codes-my2021/",
  configurator992_2: "https://configurator.porsche.com/en-QA/mode/model/9921S2",
  type911: "https://type911shop.co.uk/Porsche-Option-Codes",
};

export interface FactoryCodeRow {
  /** Our option code, matching OPTIONS in catalog.ts. */
  option: string;
  /** The Porsche factory codes that mean this option. */
  codes: string[];
  /** The generations these codes are valid for. */
  generations: Generation[];
}

export const FACTORY_CODES: FactoryCodeRow[] = [
  // ----- 991.1 (2012-2016) -----
  { option: "SPORT_CHRONO", codes: ["639", "640"], generations: ["991.1"] },
  { option: "PSE", codes: ["176"], generations: ["991.1"] },
  { option: "RAS", codes: ["470"], generations: ["991.1"] },
  { option: "BUCKETS", codes: ["P03"], generations: ["991.1"] },
  { option: "AERO", codes: ["XAT", "XAA"], generations: ["991.1"] },
  { option: "PASM_SPORT", codes: ["030", "031"], generations: ["991.1"] },
  { option: "LED_MATRIX", codes: ["602"], generations: ["991.1"] },
  { option: "ASS_PLUS", codes: ["P07"], generations: ["991.1"] },
  { option: "SUNROOF", codes: ["651", "653"], generations: ["991.1"] },
  { option: "PCCB", codes: ["450"], generations: ["991.1"] },
  { option: "BURMESTER", codes: ["682"], generations: ["991.1"] },
  { option: "LEATHER_PKG", codes: ["981", "EEA"], generations: ["991.1"] },
  { option: "COLOR_BELTS", codes: ["XSX", "XHN", "XHP", "XSH", "XHR"], generations: ["991.1"] },
  { option: "VENT_SEATS", codes: ["541"], generations: ["991.1"] },

  // ----- 991.2 (2017-2019) -----
  // US 991.2 cars in our data still use 640 for Sport Chrono; Europe uses QR5.
  { option: "SPORT_CHRONO", codes: ["640", "QR5"], generations: ["991.2"] },
  { option: "PSE", codes: ["176"], generations: ["991.2"] },
  { option: "FRONT_LIFT", codes: ["474"], generations: ["991.2"] },
  { option: "RAS", codes: ["470"], generations: ["991.2"] },
  { option: "BUCKETS", codes: ["P01", "P03"], generations: ["991.2"] },
  { option: "AERO", codes: ["XAT"], generations: ["991.2"] },
  { option: "PASM_SPORT", codes: ["030", "031"], generations: ["991.2"] },
  { option: "LED_MATRIX", codes: ["602", "XEY"], generations: ["991.2"] },
  { option: "ASS_PLUS", codes: ["P07"], generations: ["991.2"] },
  { option: "SUNROOF", codes: ["651", "653"], generations: ["991.2"] },
  { option: "PCCB", codes: ["450"], generations: ["991.2"] },
  { option: "BURMESTER", codes: ["9VJ"], generations: ["991.2"] },
  { option: "LEATHER_PKG", codes: ["EKC", "EKD"], generations: ["991.2"] },
  { option: "COLOR_BELTS", codes: ["XSX", "XHN", "XHP", "XSH", "XHU"], generations: ["991.2"] },
  { option: "VENT_SEATS", codes: ["541"], generations: ["991.2"] },

  // ----- 992.1 (2020-2024) and 992.2 (2025+) -----
  { option: "SPORT_CHRONO", codes: ["8LH", "8LU"], generations: ["992.1", "992.2"] },
  { option: "PSE", codes: ["0P9", "0P8"], generations: ["992.1", "992.2"] },
  { option: "FRONT_LIFT", codes: ["2UH"], generations: ["992.1", "992.2"] },
  { option: "RAS", codes: ["0N5"], generations: ["992.1", "992.2"] },
  { option: "BUCKETS", codes: ["Q1K"], generations: ["992.1"] },
  { option: "BUCKETS", codes: ["Q1S"], generations: ["992.2"] },
  { option: "AERO", codes: ["2D1", "2D5", "VM2", "VM3"], generations: ["992.1", "992.2"] },
  { option: "PASM_SPORT", codes: ["1BV"], generations: ["992.1", "992.2"] },
  { option: "LED_MATRIX", codes: ["8IU", "8JU", "8IT"], generations: ["992.1", "992.2"] },
  { option: "ASS_PLUS", codes: ["Q1J"], generations: ["992.1", "992.2"] },
  { option: "SUNROOF", codes: ["3FD", "3FE"], generations: ["992.1", "992.2"] },
  { option: "PCCB", codes: ["1LQ", "1LX"], generations: ["992.1", "992.2"] },
  { option: "BURMESTER", codes: ["9VJ"], generations: ["992.1", "992.2"] },
  { option: "LEATHER_PKG", codes: ["7TM"], generations: ["992.1"] },
  { option: "LEATHER_PKG", codes: ["BHV"], generations: ["992.2"] },
  { option: "COLOR_BELTS", codes: ["FI8", "FI6", "FX0", "FZ1", "FZ4", "FZ5", "FZ6", "FZ9"], generations: ["992.1"] },
  { option: "COLOR_BELTS", codes: ["FI8"], generations: ["992.2"] },
  { option: "VENT_SEATS", codes: ["4D3"], generations: ["992.1", "992.2"] },

  // Paint to Sample is not here: it shows up in the paint name, which colorFor() already handles.
];

/** Returns our option codes for a car's factory codes. Codes we don't know are ignored. */
export function optionsFromFactoryCodes(factoryCodes: string[], generation: Generation): string[] {
  const options = new Set<string>();

  for (const row of FACTORY_CODES) {
    if (!row.generations.includes(generation)) {
      continue;
    }

    const carHasOneOfTheseCodes = row.codes.some((code) => factoryCodes.includes(code));
    if (carHasOneOfTheseCodes) {
      options.add(row.option);
    }
  }

  return Array.from(options);
}
