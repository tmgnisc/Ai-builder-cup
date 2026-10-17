import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AnchorDebug, BubbleLayer, CompanionLayer, GuideLayer, Spotlight } from "@/features/companion";
import { ClientBootstrap } from "@/components/layout/ClientBootstrap";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { CartDrawer } from "@/features/cart";
import { CompareDrawer, CompareTray } from "@/features/compare";
import { tokenDefinitions } from "@/tokens/definitions";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Persona: Agentic Commerce Platform", template: "%s · Persona" },
  description: "An agentic commerce platform with Pip, an AI shopping companion that searches, compares, and verifies cart actions.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: tokenDefinitions.colors.dark.bg },
    { media: "(prefers-color-scheme: light)", color: tokenDefinitions.colors.light.bg },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Header />
        <main id="main" className="relative">
          {children}
        </main>
        <Footer />
        {/* Persistent across navigations: template.tsx remounts children, never these. */}
        <CompanionLayer />
        <BubbleLayer />
        <GuideLayer />
        <Spotlight />
        {process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_PLAYGROUND === "1" ? <AnchorDebug /> : null}
        <CartDrawer />
        <CompareTray />
        <CompareDrawer />
        <ClientBootstrap />
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
