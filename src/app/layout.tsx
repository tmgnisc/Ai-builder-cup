import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { tokenDefinitions } from "@/tokens/definitions";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Persona: electronics with a second opinion", template: "%s · Persona" },
  description:
    "An electronics store for shoppers in Nepal, with Pip: a shopping companion that searches the catalog, compares specs and confirms every cart change. Prices in NPR.",
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
