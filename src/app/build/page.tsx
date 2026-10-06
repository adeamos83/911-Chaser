import { Configurator } from "./Configurator";
import { analyzeSpec } from "../actions";
import { DATA_AS_OF, getPremiumTable } from "@/lib/market";
import { specFromParams } from "@/lib/spec";
import { createClient } from "@/lib/supabase/server";

export default async function BuildPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const spec = specFromParams(await searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Configurator
      initialSpec={spec}
      initialAnalysis={await analyzeSpec(spec)}
      optionValues={Object.values(getPremiumTable().options)}
      signedIn={!!user}
      dataAsOf={DATA_AS_OF}
    />
  );
}
