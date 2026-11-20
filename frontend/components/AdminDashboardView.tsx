import { AlertCircle, Check, Download, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import type { AnalyticsSummary, Booking, Resource, ResourceStatus } from '../types';
import { BookingStatusLabel, ResourceStatusLabel } from './StatusLabel';

interface AdminDashboardViewProps {
  resources: Resource[];
  bookings: Booking[];
  summary: AnalyticsSummary | null;
  loading: boolean;
  onRefreshAll: () => void;
  onAddResource: () => void;
  onEditResource: (resource: Resource) => void;
}

type AdminSection = 'approvals' | 'history' | 'inventory';

export function AdminDashboardView({
  resources,
  bookings,
  summary,
  loading,
  onRefreshAll,
  onAddResource,
  onEditResource,
}: AdminDashboardViewProps) {
  const [section, setSection] = useState<AdminSection>('approvals');
  const [historyFilter, setHistoryFilter] = useState<string>('All');
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);

  const pendingBookings = bookings.filter((b) => b.status === 'Pending');
  const historyBookings = bookings.filter((b) =>
    historyFilter === 'All' ? true : b.status === historyFilter
  );

  async function handleApprove(bookingId: number) {
    setError(null);
    setBusyKey(`approve-${bookingId}`);
    try {
      await api.approveBooking(bookingId);
      onRefreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to approve booking.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleConfirmReject(bookingId: number) {
    setError(null);
    setBusyKey(`reject-${bookingId}`);
    try {
      await api.rejectBooking(bookingId, rejectionReason);
      setRejectingId(null);
      setRejectionReason('');
      onRefreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reject booking.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleStatusChange(resourceId: number, status: ResourceStatus) {
    setError(null);
    setBusyKey(`status-${resourceId}`);
    try {
      await api.updateResource(resourceId, { status });
      onRefreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update resource status.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDeleteResource(resourceId: number) {
    setError(null);
    setBusyKey(`delete-${resourceId}`);
    try {
      await api.deleteResource(resourceId);
      setConfirmDeleteId(null);
      onRefreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete resource.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDownloadCsv() {
    setError(null);
    setExportingCsv(true);
    try {
      await api.downloadCsvReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export failed.');
    } finally {
      setExportingCsv(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header & Primary Admin Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Lab Administration Console
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review booking requests, manage equipment maintenance, and export utilization records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={exportingCsv}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{exportingCsv ? 'Exporting...' : 'Download CSV Report'}</span>
          </button>

          <button
            type="button"
            onClick={onAddResource}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Column KPI Summary Cards */}
      <section aria-label="Campus resource utilization metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Resources</div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {summary ? summary.totalResources : resources.length}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {summary
              ? `${summary.availableResources} Available · ${summary.maintenanceResources} Maintenance`
              : 'Across 3 lab categories'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Active Bookings Today</div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900">
            {summary ? summary.activeBookingsToday : 0}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {summary
              ? `${summary.totalBookedHoursToday} hrs approved today`
              : 'Approved sessions today'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Pending Approvals</div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-amber-700">
            {summary ? summary.pendingApprovals : pendingBookings.length}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            Awaiting lab coordinator review
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Utilization %</div>
          <div className="mt-2 text-3xl font-bold font-mono tabular-nums text-blue-700">
            {summary ? `${summary.utilizationPercent.toFixed(1)}%` : '0.0%'}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 tabular-nums">
            {summary
              ? `${summary.totalBookedHoursToday} / ${summary.totalCapacityHoursToday} capacity hrs today`
              : '12-hr daily lab window'}
          </div>
        </div>
      </section>

      {/* Category Utilization Breakdown */}
      {summary && summary.categoryBreakdown.length > 0 && (
        <section
          aria-label="Category breakdown"
          className="bg-white border border-slate-200 rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-4">
            Utilization by Lab Category
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {summary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-900">{cat.category}</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {cat.resource_count} units
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(12, ((cat.approved_bookings || 0) / Math.max(1, cat.resource_count * 2)) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 tabular-nums">
                  <span>{cat.approved_bookings || 0} approved</span>
                  <span>{cat.pending_bookings || 0} pending</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Workspace Section Tabs */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
        <button
          type="button"
          onClick={() => setSection('approvals')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            section === 'approvals'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pending Approvals ({pendingBookings.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('history')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            section === 'history'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Booking History ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('inventory')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            section === 'inventory'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Equipment & Rooms ({resources.length})
        </button>
      </div>

      {/* Section 1: Pending Approvals */}
      {section === 'approvals' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-14 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : pendingBookings.length === 0 ? (
            <div className="p-10 text-center space-y-1.5">
              <p className="text-sm font-medium text-slate-900">All booking requests reviewed</p>
              <p className="text-xs text-slate-500">
                There are no pending student reservations awaiting approval right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {pendingBookings.map((booking) => {
                const isRejecting = rejectingId === booking.id;
                return (
                  <div key={booking.id} className="p-5 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-slate-900">
                            {booking.resource_name}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            {booking.resource_asset_code}
                          </span>
                          <span className="text-xs text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-mono tabular-nums text-slate-700 font-medium">
                            {booking.booking_date} ({booking.start_time} – {booking.end_time})
                          </span>
                        </div>

                        <div className="text-xs text-slate-600">
                          Requested by <span className="font-medium text-slate-900">{booking.user_name}</span>{' '}
                          ({booking.user_department}) · {booking.user_email}
                        </div>

                        <p className="text-sm text-slate-700 pt-1">{booking.purpose}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyKey === `approve-${booking.id}`}
                          onClick={() => handleApprove(booking.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            {busyKey === `approve-${booking.id}` ? 'Approving...' : 'Approve'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(isRejecting ? null : booking.id);
                            setRejectionReason('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    {isRejecting && (
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Optional rejection reason (e.g., Reserved for ECE-401 lab section)..."
                          className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-red-600"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={busyKey === `reject-${booking.id}`}
                            onClick={() => handleConfirmReject(booking.id)}
                            className="px-3.5 py-2 text-xs font-medium text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {busyKey === `reject-${booking.id}`
                              ? 'Rejecting...'
                              : 'Confirm Rejection'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingId(null)}
                            className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Booking History */}
      {section === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <select
              aria-label="Filter booking history by status"
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
            >
              {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((st) => (
                <option key={st} value={st}>
                  {st === 'All' ? 'All Booking Statuses' : st}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4">Date & Slot</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {historyBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-slate-900">{b.resource_name}</div>
                        <div className="text-xs font-mono text-slate-500">
                          {b.resource_asset_code} · {b.resource_category}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-slate-900">{b.user_name}</div>
                        <div className="text-xs text-slate-500">{b.user_department}</div>
                      </td>
                      <td className="py-3 px-4 align-top font-mono text-xs tabular-nums whitespace-nowrap">
                        <div className="font-medium text-slate-900">{b.booking_date}</div>
                        <div className="text-slate-500">
                          {b.start_time} – {b.end_time}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-xs text-slate-700">
                        <div>{b.purpose}</div>
                        {b.rejection_reason && (
                          <div className="mt-1 text-xs text-red-700">
                            Reason: {b.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <BookingStatusLabel status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Equipment & Rooms Inventory */}
      {section === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Category & Room</th>
                  <th className="py-3 px-4">Max Slot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {resources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 align-middle">
                      <div className="font-medium text-slate-900">{res.name}</div>
                      <div className="text-xs font-mono text-slate-500">{res.asset_code}</div>
                    </td>
                    <td className="py-3 px-4 align-middle text-xs text-slate-600">
                      <div className="font-medium text-slate-800">{res.category}</div>
                      <div>{res.location}</div>
                    </td>
                    <td className="py-3 px-4 align-middle font-mono text-xs tabular-nums text-slate-700">
                      {res.max_duration_hours} hrs
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-2">
                        <ResourceStatusLabel status={res.status} />
                        <select
                          aria-label={`Change operational status for ${res.name}`}
                          value={res.status}
                          disabled={busyKey === `status-${res.id}`}
                          onChange={(e) =>
                            handleStatusChange(res.id, e.target.value as ResourceStatus)
                          }
                          className="ml-2 px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                        >
                          <option value="Available">Available</option>
                          <option value="In Use">In Use</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditResource(res)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        {confirmDeleteId === res.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              disabled={busyKey === `delete-${res.id}`}
                              onClick={() => handleDeleteResource(res.id)}
                              className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Delete ${res.name}`}
                            onClick={() => setConfirmDeleteId(res.id)}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
