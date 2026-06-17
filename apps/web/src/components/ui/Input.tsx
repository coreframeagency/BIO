import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/helpers';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1 block font-sans text-sm font-medium text-brand-black">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-xl border border-ui-border bg-white px-4 py-2.5 font-sans text-base text-brand-black focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30',
          error && 'border-brand-red',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-brand-red">{error}</p>}
    </div>
  )
);

Input.displayName = 'Input';
