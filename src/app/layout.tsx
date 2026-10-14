import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Unbounded } from "next/font/google";
import { CompanionLayer } from "@/components/companion/CompanionLayer";
import { ClientBootstrap } from "@/components/layout/ClientBootstrap";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { CartDrawer } from "@/components/store/CartDrawer";
import { CompareDrawer } from "@/components/store/CompareDrawer";
import { CompareTray } from "@/components/store/CompareTray";
import "@/styles/globals.css";

const display = Unbounded({ subsets: ["latin"], variable: "--font-unbounded", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Persona: shopping, with someone who gets it", template: "%s · Persona" },
  description: "An electronics store with Pip, an AI shopping companion that searches, compares and adds to cart for you.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
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
        <CartDrawer />
        <CompareTray />
        <CompareDrawer />
        <ClientBootstrap />
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
