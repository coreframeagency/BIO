import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/helpers';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1 block font-sans text-sm font-medium text-brand-black">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-xl border border-ui-border bg-white px-4 py-2.5 font-sans text-base text-brand-black focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30',
          error && 'border-brand-red',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-brand-red">{error}</p>}
    </div>
  )
);

Select.displayName = 'Select';
