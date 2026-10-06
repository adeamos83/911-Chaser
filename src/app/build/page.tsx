import { AppShell } from "@/components/AppShell";
import type { ColorTier } from "@/data/types";
import { getSignedInUser } from "@/lib/garage";
import { DATA_UPDATED_ON, getPremiumTable } from "@/lib/market";
import { editBuildIdFromParams, pricedAtFromParams, specFromParams } from "@/lib/spec";
import { analyzeSpec } from "../actions";
import { Configurator } from "./Configurator";

type SearchParams = Record<string, string | string[] | undefined>;

/** Server entry for Configure: reads the build from the URL, runs the first analysis, and hands it to the Configurator. */
export default async function BuildPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const spec = specFromParams(params);
  const pricedAt = pricedAtFromParams(params);
  const editBuildId = editBuildIdFromParams(params);

  const user = await getSignedInUser();
  const initialAnalysis = await analyzeSpec(spec, pricedAt);

  const table = getPremiumTable();
  const optionValues = Object.values(table.options);
  const paintTierPremiums: Record<ColorTier, number> = {
    Standard: table.colorTier.Standard.premiumUsd,
    Metallic: table.colorTier.Metallic.premiumUsd,
    Special: table.colorTier.Special.premiumUsd,
    PTS: table.colorTier.PTS.premiumUsd,
  };

  return (
    <AppShell activePage="configure" status={`Market data updated ${DATA_UPDATED_ON}`} signedIn={!!user}>
      <Configurator
        initialSpec={spec}
        initialPricedAt={pricedAt}
        initialAnalysis={initialAnalysis}
        optionValues={optionValues}
        manualPremium={table.manual.premiumUsd}
        paintTierPremiums={paintTierPremiums}
        signedIn={!!user}
        editBuildId={user ? editBuildId : undefined}
      />
    </AppShell>
  );
}
