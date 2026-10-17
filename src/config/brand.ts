/**
 * Single source of truth for the product brand identity.
 * Rule: Working product name is "Persona". Keep it in ONE brand config constant
 * so a rename is a one-line change.
 */
export const BRAND_NAME = "Persona";
export const BRAND_TAGLINE = "Agentic commerce platform";

export const BRAND = {
  name: BRAND_NAME,
  tagline: BRAND_TAGLINE,
} as const;
