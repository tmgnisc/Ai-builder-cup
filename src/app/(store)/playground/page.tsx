import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaygroundClient } from "./PlaygroundClient";

export const metadata: Metadata = { title: "Pip playground", robots: { index: false } };

/** Dev-only tuning bench for Pip. Enable in production builds with NEXT_PUBLIC_PLAYGROUND=1. */
export default function PlaygroundPage() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_PLAYGROUND !== "1") notFound();
  return <PlaygroundClient />;
}
