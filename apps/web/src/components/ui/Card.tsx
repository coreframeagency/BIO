import { HTMLAttributes } from 'react';
import { cn, getSubjectAccentColor } from '@/utils/helpers';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentColor?: string;
}

export function Card({ className, accentColor, style, children, ...props }: CardProps) {
  const color = getSubjectAccentColor(accentColor);
  return (
    <div
      className={cn(
        'rounded-2xl border border-ui-border border-l-4 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md',
        className
      )}
      style={{ borderLeftColor: color, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
