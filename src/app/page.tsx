import { Hero } from "@/components/home/Hero";
import { StoreSection } from "@/features/catalog";
import { CategorySchema } from "@/lib/commerce/schemas";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const parsed = CategorySchema.safeParse(category);
  return (
    <>
      <Hero />
      <StoreSection initialCategory={parsed.success ? parsed.data : null} />
    </>
  );
}
