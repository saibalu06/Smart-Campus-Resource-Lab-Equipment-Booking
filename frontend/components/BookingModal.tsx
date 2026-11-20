import { AlertCircle, Calendar, CheckCircle2, Clock, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { OccupiedSlot, Resource } from '../types';

interface BookingModalProps {
  resource: Resource | null;
  onClose: () => void;
  onBooked: () => void;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 8; hour <= 20; hour += 1) {
    options.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 20) {
      options.push(`${String(hour).padStart(2, '0')}:30`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function BookingModal({ resource, onClose, onBooked }: BookingModalProps) {
  const [bookingDate, setBookingDate] = useState<string>(getTodayDateString);
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [purpose, setPurpose] = useState<string>('');
  const [occupiedSlots, setOccupiedSlots] = useState<OccupiedSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!resource) return;
    setError(null);
    setSuccessMsg(null);
    let active = true;
    setLoadingSlots(true);

    api
      .getOccupiedSlots(resource.id, bookingDate)
      .then((res) => {
        if (active) setOccupiedSlots(res.slots);
      })
      .catch(() => {
        if (active) setOccupiedSlots([]);
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [resource, bookingDate]);

  const durationHours = useMemo(() => {
    const diff = toMinutes(endTime) - toMinutes(startTime);
    return diff > 0 ? diff / 60 : 0;
  }, [startTime, endTime]);

  const overlappingSlot = useMemo(() => {
    if (durationHours <= 0) return null;
    return (
      occupiedSlots.find(
        (slot) => slot.start_time < endTime && slot.end_time > startTime
      ) ?? null
    );
  }, [occupiedSlots, startTime, endTime, durationHours]);

  if (!resource) return null;

  const exceedsMaxDuration = durationHours > resource.max_duration_hours;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resource) return;
    setError(null);
    setSuccessMsg(null);

    if (durationHours <= 0) {
      setError('End time must be after start time.');
      return;
    }

    if (exceedsMaxDuration) {
      setError(`Maximum booking duration for this resource is ${resource.max_duration_hours} hours.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.createBooking({
        resource_id: resource.id,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        purpose,
      });
      setSuccessMsg('Reservation request submitted for Lab Admin approval.');
      onBooked();
      const updated = await api.getOccupiedSlots(resource.id, bookingDate);
      setOccupiedSlots(updated.slots);
      setPurpose('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit booking.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="booking-modal-title" className="text-lg font-semibold text-slate-900">
              {resource.name}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              {resource.asset_code} · {resource.location} · Max {resource.max_duration_hours} hrs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking dialog"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="flex items-start justify-between gap-3 p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-emerald-800 underline whitespace-nowrap cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          <div>
            <label
              htmlFor="booking-date"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Reservation Date
            </label>
            <div className="relative">
              <Calendar
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="booking-date"
                type="date"
                required
                min={getTodayDateString()}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          {/* Live Occupied Slots Panel */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-2">
              <span>Reserved & Pending Slots on {bookingDate}</span>
              {loadingSlots && <span className="text-slate-400">Checking...</span>}
            </div>
            {occupiedSlots.length === 0 ? (
              <p className="text-xs text-slate-500">
                No conflicts on this date. All operating hours (08:00 – 20:00) are open.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {occupiedSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono tabular-nums rounded-md border ${
                      slot.status === 'Approved'
                        ? 'bg-white border-emerald-200 text-emerald-800'
                        : 'bg-white border-amber-200 text-amber-800'
                    }`}
                  >
                    <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>
                      {slot.start_time}–{slot.end_time}
                    </span>
                    <span className="font-sans font-medium">({slot.status})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="booking-start"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Start Time
              </label>
              <select
                id="booking-start"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {TIME_OPTIONS.slice(0, -1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="booking-end"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                End Time
              </label>
              <select
                id="booking-end"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700"
              >
                {TIME_OPTIONS.slice(1).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              Selected Duration:{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {durationHours > 0 ? `${durationHours.toFixed(1)} hrs` : 'Invalid range'}
              </strong>
            </span>
            {exceedsMaxDuration && (
              <span className="text-red-700 font-medium">
                Exceeds {resource.max_duration_hours} hr limit
              </span>
            )}
            {!exceedsMaxDuration && overlappingSlot && (
              <span className="text-amber-700 font-medium">
                Overlaps {overlappingSlot.start_time}–{overlappingSlot.end_time} ({overlappingSlot.status})
              </span>
            )}
          </div>

          <div>
            <label
              htmlFor="booking-purpose"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Course / Experiment Purpose
            </label>
            <textarea
              id="booking-purpose"
              required
              minLength={5}
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe the lab experiment, course code, or seminar topic..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-700 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || durationHours <= 0 || exceedsMaxDuration}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Validating Slot...' : 'Submit Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
