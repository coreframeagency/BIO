import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/helpers';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-green text-white hover:bg-brand-greenDark',
  secondary: 'bg-transparent border-2 border-brand-green text-brand-green hover:bg-brand-greenLight',
  ghost: 'text-brand-green hover:bg-brand-greenLight',
  danger: 'bg-brand-red text-white hover:opacity-90',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-6 py-2.5 font-sans font-semibold transition-colors disabled:opacity-50',
        variants[variant],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  )
);

Button.displayName = 'Button';
