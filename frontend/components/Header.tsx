import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab = 'catalog' | 'my-bookings' | 'admin';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
  pendingCount?: number;
}

export function Header({ activeTab, onSelectTab, onOpenAuth, pendingCount }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('catalog')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          CampusLab Reserve
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary navigation" className="flex items-center gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => onSelectTab('catalog')}
            className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-blue-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Resource Catalog
          </button>

          {user && (
            <button
              type="button"
              onClick={() => onSelectTab('my-bookings')}
              className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'my-bookings'
                  ? 'border-blue-700 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              My Bookings
            </button>
          )}

          {user?.role === 'Lab Admin' && (
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'admin'
                  ? 'border-blue-700 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin Console
              {typeof pendingCount === 'number' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          )}
        </nav>

        {/* Zone 3: Single primary account action */}
        <div className="flex items-center gap-4 shrink-0">
          {user ? (
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-slate-900 leading-tight whitespace-nowrap">
                  {user.name}
                </div>
                <div className="text-xs text-slate-500 leading-tight whitespace-nowrap">
                  {user.role}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
