import Link from "next/link";
import { buttonClasses } from "@/components/ui/buttonClasses";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-xl place-items-center px-4 py-32 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Pip looked everywhere.</h1>
      <p className="mt-3 text-muted">That page or product doesn&apos;t exist.</p>
      <Link href="/" className={buttonClasses({ className: "mt-8" })}>
        Back to the store
      </Link>
    </div>
  );
}
