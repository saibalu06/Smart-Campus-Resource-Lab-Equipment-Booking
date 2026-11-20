import { AlertCircle, CalendarX2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import type { Booking } from '../types';
import { BookingStatusLabel } from './StatusLabel';

interface MyBookingsViewProps {
  bookings: Booking[];
  loading: boolean;
  onRefresh: () => void;
  onBrowseCatalog: () => void;
}

const STATUS_TABS = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const;

export function MyBookingsView({
  bookings,
  loading,
  onRefresh,
  onBrowseCatalog,
}: MyBookingsViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleBookings = bookings.filter((b) =>
    statusFilter === 'All' ? true : b.status === statusFilter
  );

  async function handleCancel(bookingId: number) {
    setError(null);
    setBusyId(bookingId);
    try {
      await api.cancelBooking(bookingId);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel booking.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Reservations</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track approval status, room assignments, and active time slots for your lab bookings.
          </p>
        </div>

        <button
          type="button"
          onClick={onBrowseCatalog}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start cursor-pointer"
        >
          New Booking
        </button>
      </div>

      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === status
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {status}
          </button>
        ))}
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

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <CalendarX2 className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
          <p className="text-base font-medium text-slate-900">No reservations found</p>
          <p className="text-sm text-slate-500">
            {statusFilter === 'All'
              ? 'Select a resource from the catalog to schedule your first lab session.'
              : `You have no ${statusFilter.toLowerCase()} bookings right now.`}
          </p>
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
          >
            Browse Resource Catalog
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {visibleBookings.map((booking) => {
                  const canCancel = booking.status === 'Pending' || booking.status === 'Approved';
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-slate-900">{booking.resource_name}</div>
                        <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                          {booking.resource_asset_code} · {booking.resource_location}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        <div className="font-medium text-slate-900">{booking.booking_date}</div>
                        <div className="text-slate-500 mt-0.5">
                          {booking.start_time} – {booking.end_time}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <p className="text-slate-700 leading-snug">{booking.purpose}</p>
                        {booking.status === 'Rejected' && booking.rejection_reason && (
                          <p className="mt-1.5 text-xs text-red-700">
                            Reason: {booking.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <BookingStatusLabel status={booking.status} />
                      </td>
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        {canCancel ? (
                          <button
                            type="button"
                            disabled={busyId === booking.id}
                            onClick={() => handleCancel(booking.id)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                          >
                            {busyId === booking.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
