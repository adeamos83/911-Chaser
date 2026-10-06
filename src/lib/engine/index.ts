/**
 * The pricing engine. Read the files in this order:
 *
 *   rules.ts         every tunable number (confidence cutoffs, payback tiers, reference mileage)
 *   stats.ts         mean, median, quantile
 *   depreciation.ts  group comparable cars; learn how price drops per mile and per year
 *   premiums.ts      how much options, a manual gearbox and special paint add at resale
 *   estimate.ts      estimate a spec's asking price; score a listing as a deal
 *   summaries.ts     price-by-year chart data and the bang-for-buck leaderboard
 *
 * The rest of the app imports from "@/lib/engine", which re-exports everything below.
 */
export * from "./rules";
export * from "./stats";
export * from "./depreciation";
export * from "./premiums";
export * from "./estimate";
export * from "./summaries";
