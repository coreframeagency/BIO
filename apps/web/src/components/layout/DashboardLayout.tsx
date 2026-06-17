import { Link, NavLink, useNavigate } from 'react-router-dom';

import { LucideIcon, LogOut, Menu, Search, X } from 'lucide-react';

import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

import { cn } from '@/utils/helpers';

import SearchModal from './SearchModal';



export interface NavItem {

  to: string;

  label: string;

  icon: LucideIcon;

}



interface DashboardLayoutProps {

  children: React.ReactNode;

  navItems: NavItem[];

  title?: string;

  showSearch?: boolean;

}



export function DashboardLayout({ children, navItems, title = 'Exam Platform', showSearch = false }: DashboardLayoutProps) {

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (showSearch) setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSearch]);



  const handleLogout = async () => {

    await logout();

    navigate('/login');

  };



  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || '?';



  const sidebar = (

    <aside className="flex h-full w-[220px] flex-col bg-brand-black p-4 text-white">

      <div className="mb-8 px-2">

        <Link to="/" className="flex items-center gap-1.5 font-serif text-lg font-bold text-white transition-colors hover:text-brand-green">

          Markly

          <span className="size-2 shrink-0 rounded-full bg-brand-green" />

        </Link>

      </div>

      <nav className="flex-1 space-y-1">

        {showSearch && (
          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              setMobileOpen(false);
            }}
            className="mb-4 flex w-full items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5 text-sm text-gray-400 transition-all hover:bg-white/20"
          >
            <Search size={16} />
            <span>Search...</span>
            <span className="ml-auto text-xs opacity-50">⌘K</span>
          </button>
        )}

        {navItems.map(({ to, label, icon: Icon }) => (

          <NavLink

            key={to}

            to={to}

            onClick={() => setMobileOpen(false)}

            className={({ isActive }) =>

              cn(

                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',

                isActive

                  ? 'bg-brand-green text-white'

                  : 'text-gray-400 hover:bg-white/10 hover:text-white'

              )

            }

          >

            <Icon size={20} />

            {label}

          </NavLink>

        ))}

      </nav>

      {user && (

        <div className="mt-4 border-t border-white/10 pt-4">

          <div className="flex items-center gap-3 px-2">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-semibold text-white">

              {userInitial}

            </div>

            <p className="truncate text-sm font-medium text-white">

              {user.firstName} {user.lastName}

            </p>

          </div>

          <button

            onClick={handleLogout}

            className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:bg-white/10 hover:text-white"

          >

            <LogOut size={20} />

            Log out

          </button>

        </div>

      )}

    </aside>

  );



  return (

    <div className="min-h-screen bg-ui-bg">

      {showSearch && (
        <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      )}

      {/* Desktop sidebar */}

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">{sidebar}</div>



      {/* Mobile overlay */}

      {mobileOpen && (

        <div className="fixed inset-0 z-40 lg:hidden">

          <div className="absolute inset-0 bg-brand-black/50" onClick={() => setMobileOpen(false)} />

          <div className="relative z-10 h-full w-[220px]">{sidebar}</div>

        </div>

      )}



      <div className="lg:pl-[220px]">

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ui-border bg-ui-bg/95 px-4 py-3 backdrop-blur lg:hidden">

          <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 hover:bg-ui-subtle">

            {mobileOpen ? <X size={24} /> : <Menu size={24} />}

          </button>

          <p className="font-serif italic font-semibold">{title}</p>

          <div className="w-10" />

        </header>



        <main className="page-enter p-4 md:p-6 lg:p-8">{children}</main>

      </div>



      {/* Mobile bottom tab bar */}

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-ui-border bg-brand-black lg:hidden">

        {navItems.slice(0, 5).map(({ to, label, icon: Icon }) => (

          <NavLink

            key={to}

            to={to}

            className={({ isActive }) =>

              cn(

                'flex flex-1 flex-col items-center gap-1 py-2 text-xs',

                isActive ? 'text-brand-green' : 'text-gray-400'

              )

            }

          >

            <Icon size={20} />

            <span className="truncate px-1">{label.split(' ')[0]}</span>

          </NavLink>

        ))}

      </nav>

      <div className="h-16 lg:hidden" />

    </div>

  );

}


