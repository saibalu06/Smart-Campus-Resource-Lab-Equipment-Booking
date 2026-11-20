import { AlertCircle, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Resource, ResourceCategory, ResourceStatus } from '../types';

interface ResourceFormModalProps {
  isOpen: boolean;
  editingResource: Resource | null;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES: ResourceCategory[] = [
  'Electronics Lab',
  'Computing Lab',
  'Seminar Rooms',
];

const STATUSES: ResourceStatus[] = ['Available', 'In Use', 'Maintenance'];

export function ResourceFormModal({
  isOpen,
  editingResource,
  onClose,
  onSaved,
}: ResourceFormModalProps) {
  const [name, setName] = useState('');
  const [assetCode, setAssetCode] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('Electronics Lab');
  const [status, setStatus] = useState<ResourceStatus>('Available');
  const [location, setLocation] = useState('');
  const [maxDuration, setMaxDuration] = useState(4);
  const [specs, setSpecs] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingResource) {
      setName(editingResource.name);
      setAssetCode(editingResource.asset_code);
      setCategory(editingResource.category);
      setStatus(editingResource.status);
      setLocation(editingResource.location);
      setMaxDuration(editingResource.max_duration_hours);
      setSpecs(editingResource.specs);
    } else {
      setName('');
      setAssetCode('');
      setCategory('Electronics Lab');
      setStatus('Available');
      setLocation('');
      setMaxDuration(4);
      setSpecs('');
    }
  }, [isOpen, editingResource]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (editingResource) {
        await api.updateResource(editingResource.id, {
          name,
          asset_code: assetCode,
          category,
          status,
          location,
          max_duration_hours: Number(maxDuration),
          specs,
        });
      } else {
        await api.createResource({
          name,
          asset_code: assetCode,
          category,
          status,
          location,
          max_duration_hours: Number(maxDuration),
          specs,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save resource.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-form-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="resource-form-title" className="text-lg font-semibold text-slate-900">
            {editingResource ? 'Edit Lab Resource' : 'Add New Lab Resource'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close resource form"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="res-name" className="block text-xs font-medium text-slate-700 mb-1">
                Equipment / Room Name
              </label>
              <input
                id="res-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tektronix MSO24 Oscilloscope"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label htmlFor="res-code" className="block text-xs font-medium text-slate-700 mb-1">
                Asset Code
              </label>
              <input
                id="res-code"
                type="text"
                required
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value.toUpperCase())}
                placeholder="EL-OSC-09"
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="res-category"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Lab Category
              </label>
              <select
                id="res-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="res-status" className="block text-xs font-medium text-slate-700 mb-1">
                Operational Status
              </label>
              <select
                id="res-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ResourceStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="res-location"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Lab Room Location
              </label>
              <input
                id="res-location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Room EE-204, Bench 2"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="res-duration"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Max Hours
              </label>
              <input
                id="res-duration"
                type="number"
                required
                min={1}
                max={24}
                value={maxDuration}
                onChange={(e) => setMaxDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="res-specs" className="block text-xs font-medium text-slate-700 mb-1">
              Technical Specifications
            </label>
            <textarea
              id="res-specs"
              required
              rows={3}
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="Bandwidth, memory, seating capacity, probes included..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : editingResource
                ? 'Save Changes'
                : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
