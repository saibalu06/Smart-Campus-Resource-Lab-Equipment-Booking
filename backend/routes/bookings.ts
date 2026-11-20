import { Router } from 'express';
import { getDb } from '../db.ts';
import { authenticateToken, requireAdmin, type AuthenticatedRequest } from '../middleware/auth.ts';
import type { BookingRow, BookingStatus, BookingWithDetails, ResourceRow } from '../types.ts';

const router = Router();

function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isValidDateString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

// Public/authenticated slot availability lookup for a specific resource & date
router.get('/slots', (req, res) => {
  const resourceId = Number(req.query.resource_id);
  const bookingDate = String(req.query.date ?? '').trim();

  if (!Number.isInteger(resourceId) || resourceId <= 0 || !isValidDateString(bookingDate)) {
    res.status(400).json({ error: 'Valid resource_id and date (YYYY-MM-DD) are required.' });
    return;
  }

  const db = getDb();
  const occupiedSlots = db
    .prepare(
      `SELECT id, start_time, end_time, status
       FROM bookings
       WHERE resource_id = ?
         AND booking_date = ?
         AND status IN ('Approved', 'Pending')
       ORDER BY start_time ASC`
    )
    .all(resourceId, bookingDate) as Array<{
    id: number;
    start_time: string;
    end_time: string;
    status: BookingStatus;
  }>;

  res.json({ slots: occupiedSlots });
});

// List bookings (Students see their own; Lab Admin sees all campus bookings)
router.get('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { status } = req.query as { status?: string };
  const db = getDb();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.user!.role !== 'Lab Admin') {
    conditions.push('b.user_id = ?');
    params.push(req.user!.userId);
  }

  if (status && ['Pending', 'Approved', 'Rejected', 'Cancelled'].includes(status)) {
    conditions.push('b.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const bookings = db
    .prepare(
      `SELECT
         b.*,
         r.name AS resource_name,
         r.asset_code AS resource_asset_code,
         r.category AS resource_category,
         r.location AS resource_location,
         u.name AS user_name,
         u.email AS user_email,
         u.department AS user_department
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.user_id = u.id
       ${whereClause}
       ORDER BY
         CASE WHEN b.status = 'Pending' THEN 0 ELSE 1 END,
         b.booking_date DESC,
         b.start_time ASC`
    )
    .all(...params) as BookingWithDetails[];

  res.json({ bookings });
});

// Create a new booking with strict atomic overlap validation
router.post('/', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { resource_id, booking_date, start_time, end_time, purpose } = req.body as {
    resource_id?: number;
    booking_date?: string;
    start_time?: string;
    end_time?: string;
    purpose?: string;
  };

  const resourceId = Number(resource_id);
  const dateStr = (booking_date ?? '').trim();
  const startStr = (start_time ?? '').trim();
  const endStr = (end_time ?? '').trim();
  const purposeStr = (purpose ?? '').trim();

  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    res.status(400).json({ error: 'A valid lab resource must be selected.' });
    return;
  }

  if (!isValidDateString(dateStr)) {
    res.status(400).json({ error: 'Booking date must be in YYYY-MM-DD format.' });
    return;
  }

  const startMinutes = parseTimeToMinutes(startStr);
  const endMinutes = parseTimeToMinutes(endStr);

  if (startMinutes === null || endMinutes === null) {
    res.status(400).json({ error: 'Start time and end time must use HH:MM (24-hour) format.' });
    return;
  }

  if (endMinutes <= startMinutes) {
    res.status(400).json({ error: 'End time must be strictly after start time.' });
    return;
  }

  if (purposeStr.length < 5) {
    res.status(400).json({ error: 'Please provide a brief lab purpose (at least 5 characters).' });
    return;
  }

  const db = getDb();

  const createBookingTx = db.transaction(() => {
    const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as
      | ResourceRow
      | undefined;

    if (!resource) {
      return { statusCode: 404, error: 'Requested resource does not exist.' };
    }

    if (resource.status === 'Maintenance') {
      return {
        statusCode: 409,
        error: `${resource.name} is currently under Maintenance and cannot be booked.`,
      };
    }

    const durationMinutes = endMinutes - startMinutes;
    const maxMinutes = resource.max_duration_hours * 60;
    if (durationMinutes > maxMinutes) {
      return {
        statusCode: 400,
        error: `Requested duration exceeds the maximum allowed ${resource.max_duration_hours} hours for this resource.`,
      };
    }

    // Strict overlap check against both Approved and Pending bookings:
    // Overlap condition: existing.start_time < requestedEnd AND existing.end_time > requestedStart
    const conflict = db
      .prepare(
        `SELECT id, start_time, end_time, status
         FROM bookings
         WHERE resource_id = ?
           AND booking_date = ?
           AND status IN ('Approved', 'Pending')
           AND start_time < ?
           AND end_time > ?
         LIMIT 1`
      )
      .get(resourceId, dateStr, endStr, startStr) as
      | { id: number; start_time: string; end_time: string; status: BookingStatus }
      | undefined;

    if (conflict) {
      return {
        statusCode: 409,
        error: `Slot conflict: overlaps with an existing ${conflict.status} booking (${conflict.start_time} – ${conflict.end_time}) on ${dateStr}.`,
      };
    }

    const insertResult = db
      .prepare(
        `INSERT INTO bookings (resource_id, user_id, booking_date, start_time, end_time, purpose, status)
         VALUES (?, ?, ?, ?, ?, ?, 'Pending')`
      )
      .run(resourceId, req.user!.userId, dateStr, startStr, endStr, purposeStr);

    const created = db
      .prepare(
        `SELECT
           b.*,
           r.name AS resource_name,
           r.asset_code AS resource_asset_code,
           r.category AS resource_category,
           r.location AS resource_location,
           u.name AS user_name,
           u.email AS user_email,
           u.department AS user_department
         FROM bookings b
         JOIN resources r ON b.resource_id = r.id
         JOIN users u ON b.user_id = u.id
         WHERE b.id = ?`
      )
      .get(Number(insertResult.lastInsertRowid)) as BookingWithDetails;

    return { statusCode: 201, booking: created };
  });

  const result = createBookingTx();
  if ('error' in result) {
    res.status(result.statusCode).json({ error: result.error });
    return;
  }

  res.status(201).json({ booking: result.booking });
});

// Lab Admin: 1-click Approve
router.patch('/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    res.status(400).json({ error: 'Invalid booking ID.' });
    return;
  }

  const db = getDb();

  const approveTx = db.transaction(() => {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as
      | BookingRow
      | undefined;

    if (!booking) {
      return { statusCode: 404, error: 'Booking request not found.' };
    }

    if (booking.status !== 'Pending') {
      return {
        statusCode: 400,
        error: `Only Pending requests can be approved (current status: ${booking.status}).`,
      };
    }

    const conflict = db
      .prepare(
        `SELECT id, start_time, end_time
         FROM bookings
         WHERE resource_id = ?
           AND booking_date = ?
           AND id != ?
           AND status = 'Approved'
           AND start_time < ?
           AND end_time > ?
         LIMIT 1`
      )
      .get(
        booking.resource_id,
        booking.booking_date,
        booking.id,
        booking.end_time,
        booking.start_time
      ) as { id: number; start_time: string; end_time: string } | undefined;

    if (conflict) {
      return {
        statusCode: 409,
        error: `Cannot approve: overlaps with Approved booking (${conflict.start_time} – ${conflict.end_time}).`,
      };
    }

    db.prepare(
      `UPDATE bookings SET status = 'Approved', rejection_reason = NULL WHERE id = ?`
    ).run(bookingId);

    const updated = db
      .prepare(
        `SELECT
           b.*,
           r.name AS resource_name,
           r.asset_code AS resource_asset_code,
           r.category AS resource_category,
           r.location AS resource_location,
           u.name AS user_name,
           u.email AS user_email,
           u.department AS user_department
         FROM bookings b
         JOIN resources r ON b.resource_id = r.id
         JOIN users u ON b.user_id = u.id
         WHERE b.id = ?`
      )
      .get(bookingId) as BookingWithDetails;

    return { statusCode: 200, booking: updated };
  });

  const result = approveTx();
  if ('error' in result) {
    res.status(result.statusCode).json({ error: result.error });
    return;
  }

  res.json({ booking: result.booking });
});

// Lab Admin: Reject with optional rejection reason
router.patch('/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    res.status(400).json({ error: 'Invalid booking ID.' });
    return;
  }

  const { rejection_reason } = req.body as { rejection_reason?: string };
  const reason = (rejection_reason ?? '').trim() || null;

  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as
    | BookingRow
    | undefined;

  if (!booking) {
    res.status(404).json({ error: 'Booking request not found.' });
    return;
  }

  if (booking.status !== 'Pending') {
    res.status(400).json({ error: `Cannot reject a booking with status ${booking.status}.` });
    return;
  }

  db.prepare(`UPDATE bookings SET status = 'Rejected', rejection_reason = ? WHERE id = ?`).run(
    reason,
    bookingId
  );

  const updated = db
    .prepare(
      `SELECT
         b.*,
         r.name AS resource_name,
         r.asset_code AS resource_asset_code,
         r.category AS resource_category,
         r.location AS resource_location,
         u.name AS user_name,
         u.email AS user_email,
         u.department AS user_department
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`
    )
    .get(bookingId) as BookingWithDetails;

  res.json({ booking: updated });
});

// Student/Owner or Admin: Cancel booking
router.patch('/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res) => {
  const bookingId = Number(req.params.id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    res.status(400).json({ error: 'Invalid booking ID.' });
    return;
  }

  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId) as
    | BookingRow
    | undefined;

  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  if (req.user!.role !== 'Lab Admin' && booking.user_id !== req.user!.userId) {
    res.status(403).json({ error: 'You can only cancel your own booking requests.' });
    return;
  }

  if (booking.status === 'Rejected' || booking.status === 'Cancelled') {
    res.status(400).json({ error: `Booking is already ${booking.status}.` });
    return;
  }

  db.prepare(`UPDATE bookings SET status = 'Cancelled' WHERE id = ?`).run(bookingId);

  const updated = db
    .prepare(
      `SELECT
         b.*,
         r.name AS resource_name,
         r.asset_code AS resource_asset_code,
         r.category AS resource_category,
         r.location AS resource_location,
         u.name AS user_name,
         u.email AS user_email,
         u.department AS user_department
       FROM bookings b
       JOIN resources r ON b.resource_id = r.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`
    )
    .get(bookingId) as BookingWithDetails;

  res.json({ booking: updated });
});

export default router;
