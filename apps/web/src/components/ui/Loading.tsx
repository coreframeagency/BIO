import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-brand-red/30 bg-brand-red/5 p-6 text-center">
      <p className="text-brand-red">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className = '',
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-ui-border bg-white p-8 text-center ${className}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-green/10" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-brand-lavender/10" />
      {Icon && <Icon className="relative mx-auto mb-4 size-12 text-ui-muted" />}
      <p className="relative font-serif text-xl font-semibold text-brand-black">{title}</p>
      {description && <p className="relative mt-2 text-ui-muted">{description}</p>}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
