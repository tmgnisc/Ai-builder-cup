/** Delivery rules shared by the agent tool and the UI, so Pip and the page never disagree. */

export const VALLEY_CITIES = ["kathmandu", "lalitpur", "patan", "bhaktapur", "kirtipur"];

export interface DeliveryInfo {
  city: string;
  zone: "valley" | "outside";
  days: string;
  fee: number;
  freeOver: number;
}

export const DELIVERY_RULES = {
  valley: { days: "1–2 days", fee: 100, freeOver: 5000 },
  outside: { days: "3–5 days", fee: 250, freeOver: 50000 },
} as const;

export function deliveryFor(city: string): DeliveryInfo {
  const zone = VALLEY_CITIES.includes(city.trim().toLowerCase()) ? "valley" : "outside";
  const name = city.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return { city: name, zone, ...DELIVERY_RULES[zone] };
}
