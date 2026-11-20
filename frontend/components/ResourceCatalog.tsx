import { Building2, Search } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Resource } from '../types';
import { ResourceCard } from './ResourceCard';

interface ResourceCatalogProps {
  resources: Resource[];
  loading: boolean;
  onBookResource: (resource: Resource) => void;
  onEditResource: (resource: Resource) => void;
  onOpenAuth: () => void;
  onViewMyBookings: () => void;
}

const CATEGORIES = ['All', 'Electronics Lab', 'Computing Lab', 'Seminar Rooms'] as const;
const STATUS_FILTERS = ['All', 'Available', 'In Use', 'Maintenance'] as const;

export function ResourceCatalog({
  resources,
  loading,
  onBookResource,
  onEditResource,
  onOpenAuth,
  onViewMyBookings,
}: ResourceCatalogProps) {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const filtered = resources.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const hay = `${item.name} ${item.asset_code} ${item.specs} ${item.location}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const availableCount = resources.filter((r) => r.status === 'Available').length;

  return (
    <div className="space-y-8">
      {/* Hero Split */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="text-xs font-medium text-blue-700">
                Engineering & Computing Facilities
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Smart Campus Resource & Lab Equipment Booking
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                Browse calibrated oscilloscopes, embedded computing rigs, and seminar rooms across
                campus with conflict-free time-slot scheduling.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              {!user ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign In to Reserve Equipment
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onViewMyBookings}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  View My Reservations
                </button>
              )}

              <div className="text-xs text-slate-500 tabular-nums">
                <span className="font-semibold text-slate-900">{availableCount}</span> of{' '}
                <span className="font-semibold text-slate-900">{resources.length}</span> resources
                ready for booking
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-100 min-h-[220px]">
            {!heroImgFailed ? (
              <img
                src="/src/assets/images/lab_hero_banner_1795156020960.jpg"
                alt="University engineering and robotics laboratory facility"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 p-8">
                <Building2 className="w-10 h-10" aria-hidden="true" />
                <span className="text-xs font-medium">Campus Engineering Laboratories</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <section aria-label="Resource filters" className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Category filter"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === category
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search lab resources"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search equipment, code, or room..."
              className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            />
          </div>

          <select
            aria-label="Filter by availability status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === 'All' ? 'All Statuses' : status}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Catalog Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden h-[380px] animate-pulse"
            >
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <p className="text-base font-medium text-slate-900">
            No lab resources match the current filters
          </p>
          <p className="text-sm text-slate-500">
            Try clearing your search query or switching back to all equipment categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSelectedStatus('All');
              setSearchQuery('');
            }}
            className="mt-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              isAuthenticated={Boolean(user)}
              isAdmin={user?.role === 'Lab Admin'}
              onBook={onBookResource}
              onEdit={onEditResource}
            />
          ))}
        </div>
      )}
    </div>
  );
}
