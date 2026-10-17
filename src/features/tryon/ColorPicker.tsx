"use client";

import { cn } from "@/lib/cn";
import type { Product } from "@/lib/commerce/schemas";
import { useTryOn } from "@/store/useTryOn";

/** Colour options for a clothing product; the choice drives the gallery, the try-on and Pip. */
export function ColorPicker({ product }: { product: Product }) {
  const options = product.specs.colors ?? [];
  const chosen = useTryOn((s) => s.colors[product.id]) ?? options[0]?.hex;
  const setColor = useTryOn((s) => s.setColor);
  if (options.length === 0) return null;
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">
        Colour: <span className="text-text">{options.find((o) => o.hex === chosen)?.name}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.hex}
            type="button"
            onClick={() => setColor(product.id, o.hex)}
            aria-label={o.name}
            aria-pressed={o.hex === chosen}
            className={cn("size-9 rounded-full hairline", o.hex === chosen && "outline outline-2 outline-offset-2 outline-accent-text")}
            style={{ background: o.hex }}
          />
        ))}
      </div>
    </fieldset>
  );
}
