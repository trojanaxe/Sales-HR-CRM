import { WHATSAPP_NUMBER } from "./constants";

/**
 * Builds the hard-coded WhatsApp deep link for a given property.
 * Message text is fixed (no free-text) so every enquiry arrives in the same,
 * easy-to-triage format for manual call connection.
 */
export function buildWhatsAppLink(propertyId: string): string {
  const message = `Hi I am interested in Property ID ${propertyId}. Please help me connect with the owner.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** General enquiry link (no specific property yet), used in the header icon. */
export function buildGeneralWhatsAppLink(): string {
  const message = "Hi, I found Homespy and I'm looking for a rental in Bangalore.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
