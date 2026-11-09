/**
 * Chip denominations used everywhere (chip rack, chips on the table, animations).
 * Tailwind class names must appear literally here so Tailwind keeps them in the build.
 */
export interface ChipDenomination {
  value: number;
  /** Background colour of the chip. */
  color: string;
  /** Border colour when the chip isn't selected in the rack. */
  ringColor: string;
  /** Colour of the chip's label text. */
  textColor: string;
}

export const CHIPS: ChipDenomination[] = [
  { value: 1, color: 'bg-gray-200', ringColor: 'border-gray-500', textColor: 'text-black' },
  { value: 5, color: 'bg-red-600', ringColor: 'border-red-300', textColor: 'text-white' },
  { value: 25, color: 'bg-green-600', ringColor: 'border-green-300', textColor: 'text-white' },
  { value: 50, color: 'bg-blue-600', ringColor: 'border-blue-300', textColor: 'text-white' },
  { value: 100, color: 'bg-gray-900', ringColor: 'border-gray-400', textColor: 'text-white' },
];

/** The largest chip that fits in `amount` — used to pick how a stack is drawn. */
export const chipForAmount = (amount: number): ChipDenomination =>
  [...CHIPS].reverse().find(chip => amount >= chip.value) ?? CHIPS[0];

/** How many chips to draw for a stack (capped so tall stacks stay readable). */
export const chipStackCount = (amount: number): number =>
  Math.max(1, Math.min(5, Math.ceil(amount / chipForAmount(amount).value)));

/** True for the light $1 chip, which needs dark borders/text to stay visible. */
export const isLightChip = (chip: ChipDenomination) => chip.value === 1;
