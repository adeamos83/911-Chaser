import { Configurator } from "./Configurator";
import { analyzeSpec } from "../actions";
import { DATA_AS_OF, getPremiumTable } from "@/lib/market";
import { specFromParams } from "@/lib/spec";
import { createClient } from "@/lib/supabase/server";

/** Server entry for /build: reads the spec from the URL, runs the first analysis, and hands it to the Configurator. */
export default async function BuildPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const spec = specFromParams(params);

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const initialAnalysis = await analyzeSpec(spec);
  const optionValues = Object.values(getPremiumTable().options);

  return (
    <Configurator
      initialSpec={spec}
      initialAnalysis={initialAnalysis}
      optionValues={optionValues}
      signedIn={!!user}
      dataAsOf={DATA_AS_OF}
    />
  );
}
