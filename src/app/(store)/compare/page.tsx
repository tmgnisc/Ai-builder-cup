import type { Metadata } from "next";
import { parseAndValidateCompareIds } from "@/lib/commerce/compareUrl";
import { CompareWorkspace } from "@/features/compare";

export const metadata: Metadata = {
  title: "Compare products",
  description: "Side-by-side spec comparison and live inventory for tech products.",
};

interface ComparePageProps {
  searchParams: Promise<{ ids?: string | string[] }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  console.log("[ComparePage Server params]", JSON.stringify(params));
  const validation = parseAndValidateCompareIds(params.ids);
  console.log("[ComparePage Server validation]", JSON.stringify(validation.validIds));

  return (
    <CompareWorkspace
      initialValidIds={validation.validIds}
      initialDroppedUnknown={validation.droppedUnknown}
      initialMessage={validation.message}
    />
  );
}
