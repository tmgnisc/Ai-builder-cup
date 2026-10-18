import type { Category } from "@/lib/commerce/schemas";

/**
 * Starting points for the merchant "Add product" form: a photo plus the catalog palette used for
 * the generated product art. Palettes are product data (like products.json), not theme colours.
 */
export const DEFAULT_PALETTE: [string, string] = ["#1F2022", "#F4F4F6"];

export const PHOTO_PRESETS = [
  {
    label: "MacBook Pro",
    category: "laptops" as Category,
    brand: "Apple",
    url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80",
    palette: ["#1D1D1F", "#F5F5F7"] as [string, string],
  },
  {
    label: "ThinkPad Ultrabook",
    category: "laptops" as Category,
    brand: "Lenovo",
    url: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=1200&q=80",
    palette: ["#141414", "#E2231A"] as [string, string],
  },
  {
    label: "Galaxy S24 Ultra",
    category: "phones" as Category,
    brand: "Samsung",
    url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=1200&q=80",
    palette: ["#23282D", "#E8ECF0"] as [string, string],
  },
  {
    label: "iPhone 16 Pro",
    category: "phones" as Category,
    brand: "Apple",
    url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80",
    palette: ["#1F2022", "#C7B9A5"] as [string, string],
  },
  {
    label: "Sony WH-1000XM5",
    category: "headphones" as Category,
    brand: "Sony",
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    palette: ["#1C1B1B", "#C8B273"] as [string, string],
  },
  {
    label: "Nepali Dhaka Kurtha",
    category: "clothing" as Category,
    brand: "Palpali Loom",
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80",
    palette: ["#8B1E1E", "#FAF7F2"] as [string, string],
  },
  {
    label: "Nepali Daura Suruwal",
    category: "clothing" as Category,
    brand: "Himalayan Heritage",
    url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=80",
    palette: ["#2A2A2A", "#FFFFFF"] as [string, string],
  },
  {
    label: "Pashmina Shawl",
    category: "clothing" as Category,
    brand: "Cashmere Craft",
    url: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=1200&q=80",
    palette: ["#7A2E3B", "#FDF6EC"] as [string, string],
  },
  {
    label: "Himalayan Hoodie",
    category: "clothing" as Category,
    brand: "Sherpa Outfitters",
    url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=80",
    palette: ["#18232C", "#EAEAEA"] as [string, string],
  },
];
