import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-ui-bg">
      <header className="border-b border-ui-border bg-ui-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link to="/" className="flex items-center gap-1.5 font-serif text-xl font-bold tracking-tight text-brand-black">
            Markly
            <span className="size-2 rounded-full bg-brand-green" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/about" className="text-sm font-medium text-ui-muted hover:text-brand-green">
              About
            </Link>
            <Link to="/pricing" className="text-sm font-medium text-ui-muted hover:text-brand-green">
              Pricing
            </Link>
            <Link to="/subjects" className="text-sm font-medium text-ui-muted hover:text-brand-green">
              Subjects
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="px-4 py-2">
                Sign in
              </Button>
            </Link>
            <Link to="/register">
              <Button className="px-4 py-2">Start free</Button>
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
