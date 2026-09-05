/**
 * The date-stamp urgency device (app design system §2): a continuous
 * interpolation from muted ink (far off) through dusty rose (approaching)
 * and aged bronze (soon) to muted red (imminent), like aging stamp ink.
 * Past deadlines render as expired ink: struck through, faded.
 */

const ANCHORS: { days: number; color: RGB }[] = [
  { days: 30, color: hexToRgb("#7A6062") }, // stamp-neutral
  { days: 14, color: hexToRgb("#C98F97") }, // stamp-approaching
  { days: 4, color: hexToRgb("#A97C50") }, // stamp-soon
  { days: 0, color: hexToRgb("#A65C5C") }, // stamp-imminent
];

const EXPIRED_COLOR = "#A65C5C";

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToCss({ r, g, b }: RGB): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/** Fractional days until the deadline; negative once it has passed. */
export function daysUntil(deadline: string, now = new Date()): number {
  return (new Date(deadline).getTime() - now.getTime()) / 86_400_000;
}

export function stampStyle(
  deadline: string,
  now = new Date(),
): { color: string; expired: boolean } {
  const days = daysUntil(deadline, now);
  if (days < 0) {
    return { color: EXPIRED_COLOR, expired: true };
  }

  const clamped = Math.min(days, 30);
  let upper = ANCHORS[0];
  let lower = ANCHORS[0];
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    if (clamped <= ANCHORS[i].days && clamped >= ANCHORS[i + 1].days) {
      upper = ANCHORS[i];
      lower = ANCHORS[i + 1];
      break;
    }
  }

  const span = upper.days - lower.days;
  const t = span === 0 ? 0 : (upper.days - clamped) / span;
  const color = {
    r: upper.color.r + (lower.color.r - upper.color.r) * t,
    g: upper.color.g + (lower.color.g - upper.color.g) * t,
    b: upper.color.b + (lower.color.b - upper.color.b) * t,
  };

  return { color: rgbToCss(color), expired: false };
}

/** Stamp text, e.g. "SEP 21" (year appended when it isn't this year). */
export function formatStampDate(deadline: string, now = new Date()): string {
  const date = new Date(deadline);
  const month = date
    .toLocaleString("en-US", { month: "short" })
    .toUpperCase();
  const day = date.getDate();
  const year = date.getFullYear();
  return year === now.getFullYear() ? `${month} ${day}` : `${month} ${day} ${year}`;
}
