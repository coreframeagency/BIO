import clsx from 'clsx';

export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return clsx(inputs);
}

export function formatPrice(cents: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getSubjectAccentColor(color?: string | null): string {
  return color || '#245E55';
}
