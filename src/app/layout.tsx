import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { tokenDefinitions } from "@/tokens/definitions";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Persona: Agentic E-Commerce Platform", template: "%s · Persona" },
  description:
    "An agentic e-commerce platform for shoppers in Nepal, with Pip: an intelligent shopping companion that searches products, compares options, and verifies every cart update. Prices in NPR.",
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
      {/* Document shell only: the storefront ((store)/layout) and the merchant portal (merchant/layout)
          each bring their own chrome, so neither leaks into the other. */}
      <body>{children}</body>
    </html>
  );
}
