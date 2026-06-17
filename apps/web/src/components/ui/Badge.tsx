import { HTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

type BadgeVariant = 'default' | 'published' | 'draft' | 'archived' | 'examBoard' | 'visual';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-brand-greenLight text-brand-green',
  published: 'bg-green-100 text-green-800',
  draft: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-gray-100 text-gray-600',
  examBoard: 'bg-brand-green/10 text-brand-green',
  visual: 'bg-brand-lavender/20 text-brand-lavender',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex rounded-full px-3 py-1 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  );
}
