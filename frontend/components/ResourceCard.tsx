import { CalendarPlus, Cpu, FlaskConical, Presentation } from 'lucide-react';
import { useState } from 'react';
import type { Resource } from '../types';
import { ResourceStatusLabel } from './StatusLabel';

interface ResourceCardProps {
  resource: Resource;
  isAuthenticated: boolean;
  isAdmin: boolean;
  onBook: (resource: Resource) => void;
  onEdit?: (resource: Resource) => void;
}

function CategoryFallbackIcon({ category }: { category: Resource['category'] }) {
  switch (category) {
    case 'Electronics Lab':
      return <FlaskConical className="w-8 h-8 text-slate-400" aria-hidden="true" />;
    case 'Computing Lab':
      return <Cpu className="w-8 h-8 text-slate-400" aria-hidden="true" />;
    case 'Seminar Rooms':
      return <Presentation className="w-8 h-8 text-slate-400" aria-hidden="true" />;
  }
}

export function ResourceCard({
  resource,
  isAuthenticated,
  isAdmin,
  onBook,
  onEdit,
}: ResourceCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const isMaintenance = resource.status === 'Maintenance';

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col transition-colors hover:border-slate-300">
      <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {!imgFailed && resource.image_url ? (
          <img
            src={resource.image_url}
            alt={`${resource.name} in ${resource.location}`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500 p-4 text-center">
            <CategoryFallbackIcon category={resource.category} />
            <span className="text-xs font-medium text-slate-500">{resource.category}</span>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900 leading-snug">
            {resource.name}
          </h3>
          <span className="font-mono text-xs text-slate-500 tabular-nums shrink-0 pt-0.5">
            {resource.asset_code}
          </span>
        </div>

        {/* Unboxed zero-pill metadata line */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
          <span>{resource.category}</span>
          <span aria-hidden="true">·</span>
          <span>{resource.location}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">Max {resource.max_duration_hours} hrs</span>
        </div>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-2">
          {resource.specs}
        </p>

        <div className="pt-4 mt-auto border-t border-slate-100 flex items-center justify-between gap-3">
          <ResourceStatusLabel status={resource.status} />

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(resource)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              disabled={isMaintenance}
              onClick={() => onBook(resource)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isMaintenance
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-700 text-white hover:bg-blue-800 cursor-pointer'
              }`}
            >
              <CalendarPlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {isMaintenance
                  ? 'Unavailable'
                  : isAuthenticated
                  ? 'Book Slot'
                  : 'Sign In to Book'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
