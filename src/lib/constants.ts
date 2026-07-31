export const BRAND_NAME = "Homespy";

export const SERVICE_AREAS = ["Thanisandra", "HegdeNagar", "Kothanur", "Nagawara"];

export const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "919731993079";

export const PRICING_PLANS = [
  {
    price: 199,
    label: "1 owner call",
    description: "Perfect for checking out a single property you like.",
  },
  {
    price: 299,
    label: "3 owner calls",
    description: "Compare a few options before you decide.",
  },
  {
    price: 999,
    label: "10 owner calls",
    description: "Valid same day — ideal for a focused house-hunting sprint.",
  },
] as const;
