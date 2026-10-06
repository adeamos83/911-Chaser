/**
 * Pulls used Porsche 911 (991 and 992) listings from the MarketCheck API.
 *
 * There are three steps:
 *   1. search  - get every car currently for sale (50 cars per API call)
 *   2. extras  - get the factory option sheet for some cars (1 car per API call)
 *   3. build   - turn the raw API data into src/data/listings.json, which the app reads
 *
 * Every API response is saved to .cache/marketcheck, so running a step twice
 * never pays for the same API call twice.
 *
 * Run one step at a time:
 *   npx tsx --env-file=.env.local scripts/pull-marketcheck.ts search
 *   npx tsx --env-file=.env.local scripts/pull-marketcheck.ts extras 350
 *   npx tsx scripts/pull-marketcheck.ts build
 *
 * Or run all three for this month (this is what the GitHub Action does on the 1st of every month):
 *   npx tsx scripts/pull-marketcheck.ts monthly
 *
 * The monthly run also saves data/snapshots/<YYYY-MM>.json so we keep a price history.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Listing } from "../src/data/types";

const API_URL = "https://api.marketcheck.com/v2";
const API_KEY = process.env.MARKETCHECK_API_KEY;

const CACHE_FOLDER = join(__dirname, "..", ".cache", "marketcheck");
const LISTINGS_FILE = join(__dirname, "..", "src", "data", "listings.json");
const SNAPSHOTS_FOLDER = join(__dirname, "..", "data", "snapshots");

// The free MarketCheck plan allows 500 calls a month. We stop at 400 to leave room for mistakes.
const MAX_CALLS_PER_RUN = Number(process.env.MARKETCHECK_BUDGET ?? 400);

// MarketCheck returns at most 50 cars per search call, and stops paging after 500 cars.
const CARS_PER_PAGE = 50;
const MAX_CARS_PER_YEAR = 500;
const FIRST_MODEL_YEAR = 2012; // first year of the 991

// For example "2026-11". Used to name this month's cache folder and snapshot file.
const THIS_MONTH = new Date().toISOString().slice(0, 7);

/** Thrown when we hit MAX_CALLS_PER_RUN, so we can stop cleanly instead of spending more. */
class OutOfCallsError extends Error {}

/** The fields we use from one car in a MarketCheck search result. */
interface RawListing {
  id: string;
  vin: string;
  price?: number;
  miles?: number;
  msrp?: number;
  exterior_color?: string;
  base_ext_color?: string;
  first_seen_at_date?: string;
  dom?: number;
  vdp_url?: string;
  heading?: string;
  build?: {
    year?: number;
    trim?: string;
    version?: string;
    transmission?: string;
    body_type?: string;
  };
}

// ---------------------------------------------------------------------------
// Calling the API
// ---------------------------------------------------------------------------

let callsMadeThisRun = 0;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Calls the MarketCheck API, or returns the saved copy if we already made this exact call.
 * `cacheFileName` is where the response is saved inside CACHE_FOLDER.
 */
async function callApi(apiPath: string, searchParams: Record<string, string>, cacheFileName: string) {
  const cacheFile = join(CACHE_FOLDER, cacheFileName);

  // Already have it? Use the saved copy for free.
  if (existsSync(cacheFile)) {
    const savedText = readFileSync(cacheFile, "utf8");
    return JSON.parse(savedText);
  }

  if (!API_KEY) {
    throw new Error("MARKETCHECK_API_KEY is missing");
  }
  if (callsMadeThisRun >= MAX_CALLS_PER_RUN) {
    throw new OutOfCallsError(`Used all ${MAX_CALLS_PER_RUN} calls for this run`);
  }

  const query = new URLSearchParams({ api_key: API_KEY, ...searchParams });
  const response = await fetch(`${API_URL}/${apiPath}?${query}`);
  callsMadeThisRun = callsMadeThisRun + 1;

  const data = await response.json();
  if (!response.ok) {
    const shortError = JSON.stringify(data).slice(0, 200);
    throw new Error(`MarketCheck returned ${response.status}: ${shortError}`);
  }

  // MarketCheck puts our API key inside photo URLs. Remove it before saving to disk.
  const textToSave = JSON.stringify(data).replaceAll(API_KEY, "REDACTED");
  writeFileSync(cacheFile, textToSave);

  // Pause a little between calls so we stay under MarketCheck's rate limit.
  await wait(250);

  return data;
}

// ---------------------------------------------------------------------------
// Step 1: search for every car for sale
// ---------------------------------------------------------------------------

/**
 * Searches every model year, page by page, and saves each page.
 * `searchFolder` is "search" for the original pull, or "2026-11/search" for a monthly pull.
 */
async function searchAllCars(searchFolder = "search") {
  mkdirSync(join(CACHE_FOLDER, searchFolder), { recursive: true });

  const lastModelYear = new Date().getFullYear() + 1; // next year's cars go on sale early

  for (let year = FIRST_MODEL_YEAR; year <= lastModelYear; year++) {
    let carsFound = 0;
    let start = 0;

    do {
      const searchParams = {
        make: "porsche",
        model: "911",
        year: String(year),
        car_type: "used",
        rows: String(CARS_PER_PAGE),
        start: String(start),
      };
      const cacheFileName = `${searchFolder}/${year}-${start}.json`;

      const page = await callApi("search/car/active", searchParams, cacheFileName);
      carsFound = page.num_found ?? 0;
      start = start + CARS_PER_PAGE;
    } while (start < carsFound && start < MAX_CARS_PER_YEAR);

    console.log(`${year}: ${carsFound} cars found`);
  }

  console.log(`Search done. ${callsMadeThisRun} new API calls.`);
}

/** Reads every saved search page and returns each car once (a car can show up on two pages). */
function readSavedSearchResults(searchFolder = "search"): RawListing[] {
  const folder = join(CACHE_FOLDER, searchFolder);
  const carsByVin = new Map<string, RawListing>();

  for (const fileName of readdirSync(folder)) {
    const page = JSON.parse(readFileSync(join(folder, fileName), "utf8"));
    const carsOnPage: RawListing[] = page.listings ?? [];

    for (const car of carsOnPage) {
      const uniqueId = car.vin ?? car.id;
      carsByVin.set(uniqueId, car);
    }
  }

  return Array.from(carsByVin.values());
}

/** Reads the current listings.json, keyed by car id (the VIN), so we can look up last month's data. */
function readCurrentListings(): Map<string, Listing> {
  const listingsById = new Map<string, Listing>();
  if (!existsSync(LISTINGS_FILE)) {
    return listingsById;
  }

  const listings: Listing[] = JSON.parse(readFileSync(LISTINGS_FILE, "utf8"));
  for (const listing of listings) {
    listingsById.set(listing.id, listing);
  }
  return listingsById;
}

// ---------------------------------------------------------------------------
// Step 2: get option sheets
// ---------------------------------------------------------------------------

/**
 * Gets the option sheet for up to `maxCars` cars that don't have one yet.
 * Option sheets cost 1 call per car, so we spread them evenly across every generation + trim.
 */
async function getOptionSheets(maxCars: number, searchFolder = "search") {
  mkdirSync(join(CACHE_FOLDER, "extra"), { recursive: true });
  const { mapListing } = await import("./marketcheck-map");
  const currentListings = readCurrentListings();

  // Put cars into groups like "992.1|Carrera S".
  const carsByGroup = new Map<string, RawListing[]>();
  for (const rawCar of readSavedSearchResults(searchFolder)) {
    const car = mapListing(rawCar);
    if (!car) {
      continue; // a car we don't track, like a 997 or a GT3
    }

    const alreadyHaveOptions = currentListings.get(car.id)?.optionsKnown === true;
    if (alreadyHaveOptions) {
      continue;
    }

    const groupName = `${car.generation}|${car.trim}`;
    if (!carsByGroup.has(groupName)) {
      carsByGroup.set(groupName, []);
    }
    carsByGroup.get(groupName)!.push(rawCar);
  }

  // Pick one car from each group, then one more from each group, and so on,
  // so no generation or trim gets left out.
  const carsToFetch: RawListing[] = [];
  const groups = Array.from(carsByGroup.values());
  let carsLeft = groups.some((group) => group.length > 0);

  while (carsToFetch.length < maxCars && carsLeft) {
    for (const group of groups) {
      if (group.length > 0 && carsToFetch.length < maxCars) {
        carsToFetch.push(group.shift()!);
      }
    }
    carsLeft = groups.some((group) => group.length > 0);
  }

  for (const rawCar of carsToFetch) {
    try {
      await callApi(`listing/car/${rawCar.id}/extra`, {}, `extra/${rawCar.id}.json`);
    } catch (error) {
      if (error instanceof OutOfCallsError) {
        console.log("Out of API calls for this run. Stopping option sheets here.");
        break;
      }
      // One bad car shouldn't stop the whole run.
      console.warn(`Skipped car ${rawCar.id}: ${(error as Error).message}`);
    }
  }

  console.log(`Option sheets done. ${callsMadeThisRun} new API calls.`);
}

// ---------------------------------------------------------------------------
// Step 3: build listings.json and this month's snapshot
// ---------------------------------------------------------------------------

async function buildListingsFile(searchFolder = "search") {
  const { mapListing, mapOptions, factoryCodesFrom } = await import("./marketcheck-map");
  const currentListings = readCurrentListings();
  const newListings: Listing[] = [];

  for (const rawCar of readSavedSearchResults(searchFolder)) {
    const car = mapListing(rawCar);
    if (!car) {
      continue;
    }

    const optionSheetFile = join(CACHE_FOLDER, "extra", `${rawCar.id}.json`);
    const lastMonth = currentListings.get(car.id);

    if (existsSync(optionSheetFile)) {
      // We have this car's option sheet: turn it into our option codes, and keep the raw factory codes.
      const optionSheet = JSON.parse(readFileSync(optionSheetFile, "utf8"));
      newListings.push({
        ...car,
        options: mapOptions(optionSheet, car.body),
        optionsKnown: true,
        factoryCodes: factoryCodesFrom(optionSheet),
      });
    } else if (lastMonth?.optionsKnown) {
      // We got this car's options in an earlier month: reuse them instead of paying again.
      newListings.push({ ...car, options: lastMonth.options, optionsKnown: true, factoryCodes: lastMonth.factoryCodes });
    } else {
      // No option data for this car yet.
      newListings.push({ ...car, options: [], optionsKnown: false });
    }
  }

  writeFileSync(LISTINGS_FILE, JSON.stringify(newListings));
  const carsWithOptions = newListings.filter((listing) => listing.optionsKnown).length;
  console.log(`Wrote ${newListings.length} listings (${carsWithOptions} with options).`);

  saveMonthlySnapshot(newListings);
}

/**
 * Saves one small row per car for this month. Comparing two months shows
 * which cars dropped in price and which ones disappeared (probably sold).
 */
function saveMonthlySnapshot(listings: Listing[]) {
  mkdirSync(SNAPSHOTS_FOLDER, { recursive: true });

  const snapshotRows = listings.map((car) => ({
    id: car.id,
    generation: car.generation,
    trim: car.trim,
    modelYear: car.modelYear,
    mileage: car.mileage,
    price: car.price,
    daysOnMarket: car.dom,
  }));

  const snapshotFile = join(SNAPSHOTS_FOLDER, `${THIS_MONTH}.json`);
  writeFileSync(snapshotFile, JSON.stringify(snapshotRows));
  console.log(`Wrote snapshot ${THIS_MONTH} (${snapshotRows.length} cars).`);
}

// ---------------------------------------------------------------------------
// Monthly run: all three steps, with this month's own search folder
// ---------------------------------------------------------------------------

async function runMonthlyPull() {
  const searchFolder = `${THIS_MONTH}/search`;

  await searchAllCars(searchFolder);
  await getOptionSheets(MAX_CALLS_PER_RUN, searchFolder); // stops by itself when calls run out
  await buildListingsFile(searchFolder);

  console.log(`Monthly pull done. Used ${callsMadeThisRun} of ${MAX_CALLS_PER_RUN} allowed calls.`);
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const command = process.argv[2];
const commandArgument = process.argv[3];

if (command === "search") {
  searchAllCars();
} else if (command === "extras") {
  getOptionSheets(Number(commandArgument ?? 350));
} else if (command === "build") {
  buildListingsFile();
} else if (command === "monthly") {
  runMonthlyPull();
} else {
  console.log("Usage: search | extras <number of cars> | build | monthly");
}
