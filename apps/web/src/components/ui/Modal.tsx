import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/helpers';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-brand-black/50" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 flex h-full w-full max-h-full flex-col overflow-y-auto border-ui-border bg-white p-6 shadow-xl md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-2xl md:border',
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="font-serif text-2xl font-semibold text-brand-black">{title}</h3>}
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-ui-muted hover:bg-ui-subtle hover:text-brand-black"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
