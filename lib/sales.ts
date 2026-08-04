// Sales income channels. Stored as plain text in sales.channel.
export const SALE_CHANNELS = [
  "เงินสด",
  "โอน",
  "เดลิเวอรี่",
  "อื่น ๆ",
] as const;

export type SaleChannel = (typeof SALE_CHANNELS)[number];
