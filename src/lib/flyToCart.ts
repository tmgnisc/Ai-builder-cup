"use client";

import { gsap, motion } from "@/lib/motion";

const CART_SELECTOR = "[data-cart-target]";

/** Bounces the header cart icon. */
export function bumpCart() {
  const cart = document.querySelector<HTMLElement>(CART_SELECTOR);
  if (!cart) return;
  if (motion.reduced) return;
  gsap
    .timeline()
    .to(cart, { scale: 1.28, rotate: -8, duration: 0.14, ease: "power2.out" })
    .to(cart, { scale: 1, rotate: 0, duration: 0.7, ease: "elastic.out(1, 0.35)" });
}

/**
 * Flies a clone of `source` (usually a product thumbnail) along a curved path into the
 * header cart icon, then bumps the icon. Resolves when the clone lands.
 * Under reduced motion: no flight, just resolves (the caller still peeks the drawer).
 */
export function flyToCart(source: Element | null): Promise<void> {
  const cart = document.querySelector<HTMLElement>(CART_SELECTOR);
  if (!source || !cart || motion.reduced) {
    bumpCart();
    return Promise.resolve();
  }

  const from = source.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  if (from.width === 0) {
    bumpCart();
    return Promise.resolve();
  }

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: "0",
    zIndex: "70",
    pointerEvents: "none",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 20px 50px -10px var(--overlay), 0 0 0 1px var(--border-strong)",
    transformOrigin: "50% 50%",
    willChange: "transform, opacity",
  });
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const endScale = Math.max(0.06, 28 / from.width);
  // Arc up and over: the control point sits above the higher of the two ends.
  const lift = Math.min(220, Math.abs(dx) * 0.35 + 80);

  return new Promise((resolve) => {
    gsap
      .timeline({
        onComplete: () => {
          clone.remove();
          resolve();
        },
      })
      .to(clone, { scale: 0.55, duration: 0.18, ease: "power2.out" })
      .to(clone, {
        duration: 0.85,
        ease: "power2.inOut",
        motionPath: {
          path: [
            { x: dx * 0.25, y: Math.min(0, dy) - lift },
            { x: dx, y: dy },
          ],
          curviness: 1.4,
        },
        scale: endScale,
        rotate: dx > 0 ? 18 : -18,
        borderRadius: "50%",
      })
      .to(clone, { opacity: 0, duration: 0.12 }, "-=0.08")
      .add(bumpCart, "-=0.12");
  });
}
