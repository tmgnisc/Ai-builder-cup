import { AnchorDebug, BubbleLayer, CompanionLayer, GuideLayer, Spotlight } from "@/features/companion";
import { ClientBootstrap } from "@/components/layout/ClientBootstrap";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CartDrawer } from "@/features/cart";
import { CompareDrawer, CompareTray } from "@/features/compare";

/** Storefront chrome: header, footer, Pip, cart and compare. The merchant portal never mounts any of it. */
export default function StoreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <main id="main" className="relative">
        {children}
      </main>
      <Footer />
      {/* Persistent across store navigations: template.tsx remounts children, never these. */}
      <CompanionLayer />
      <BubbleLayer />
      <GuideLayer />
      <Spotlight />
      {process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_PLAYGROUND === "1" ? <AnchorDebug /> : null}
      <CartDrawer />
      <CompareTray />
      <CompareDrawer />
      <ClientBootstrap />
    </>
  );
}
