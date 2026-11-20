import { Router } from 'express';
import { getDb } from '../db.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import type { BookingWithDetails } from '../types.ts';

const router = Router();

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function durationHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/summary', authenticateToken, requireAdmin, (_req, res) => {
  const db = getDb();
  const today = todayLocalDate();

  const totalResources = (
    db.prepare('SELECT COUNT(*) AS count FROM resources').get() as { count: number }
  ).count;

  const availableResources = (
    db.prepare(`SELECT COUNT(*) AS count FROM resources WHERE status = 'Available'`).get() as {
      count: number;
    }
  ).count;

  const inUseResources = (
    db.prepare(`SELECT COUNT(*) AS count FROM resources WHERE status = 'In Use'`).get() as {
      count: number;
    }
  ).count;

  const maintenanceResources = (
    db.prepare(`SELECT COUNT(*) AS count FROM resources WHERE status = 'Maintenance'`).get() as {
      count: number;
    }
  ).count;

  const todayApproved = db
    .prepare(
      `SELECT start_time, end_time
       FROM bookings
       WHERE booking_date = ? AND status = 'Approved'`
    )
    .all(today) as Array<{ start_time: string; end_time: string }>;

  const activeBookingsToday = todayApproved.length;

  const pendingApprovals = (
    db.prepare(`SELECT COUNT(*) AS count FROM bookings WHERE status = 'Pending'`).get() as {
      count: number;
    }
  ).count;

  // Standard campus lab operating day = 12 hours (08:00 - 20:00) per active non-maintenance resource
  const activeResourcesCount = Math.max(1, totalResources - maintenanceResources);
  const totalCapacityHoursToday = activeResourcesCount * 12;
  const totalBookedHoursToday = todayApproved.reduce(
    (sum, b) => sum + durationHours(b.start_time, b.end_time),
    0
  );

  // Also factor resources currently marked "In Use" if no approved slot covers them, or strictly reflect booked hours + active utilization
  const rawUtil = (totalBookedHoursToday / totalCapacityHoursToday) * 100;
  const utilizationPercent = Math.min(100, Math.round(rawUtil * 10) / 10);

  const categoryBreakdown = db
    .prepare(
      `SELECT
         r.category,
         COUNT(DISTINCT r.id) AS resource_count,
         SUM(CASE WHEN b.status = 'Approved' THEN 1 ELSE 0 END) AS approved_bookings,
         SUM(CASE WHEN b.status = 'Pending' THEN 1 ELSE 0 END) AS pending_bookings
       FROM resources r
       LEFT JOIN bookings b ON r.id = b.resource_id
       GROUP BY r.category
       ORDER BY r.category ASC`
    )
    .all() as Array<{
    category: string;
    resource_count: number;
    approved_bookings: number;
    pending_bookings: number;
  }>;

  res.json({
    summary: {
      totalResources,
      availableResources,
      inUseResources,
      maintenanceResources,
      activeBookingsToday,
      pendingApprovals,
      utilizationPercent,
      totalBookedHoursToday: Math.round(totalBookedHoursToday * 10) / 10,
      totalCapacityHoursToday,
      categoryBreakdown,
    },
  });
});

router.get('/export-csv', authenticateToken, requireAdmin, (_req, res) => {
  const db = getDb();
  const rows = db
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
       ORDER BY b.booking_date DESC, b.start_time ASC`
    )
    .all() as BookingWithDetails[];

  const headers = [
    'Booking ID',
    'Status',
    'Date',
    'Start Time',
    'End Time',
    'Duration (Hours)',
    'Asset Code',
    'Resource Name',
    'Category',
    'Lab Location',
    'Requester Name',
    'Requester Email',
    'Department',
    'Purpose',
    'Rejection Reason',
    'Created At',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const row of rows) {
    const hrs = durationHours(row.start_time, row.end_time).toFixed(1);
    lines.push(
      [
        row.id,
        row.status,
        row.booking_date,
        row.start_time,
        row.end_time,
        hrs,
        row.resource_asset_code,
        row.resource_name,
        row.resource_category,
        row.resource_location,
        row.user_name,
        row.user_email,
        row.user_department,
        row.purpose,
        row.rejection_reason ?? '',
        row.created_at,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
  }

  const csvContent = lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="campus-lab-bookings-${todayLocalDate()}.csv"`
  );
  res.send(csvContent);
});

export default router;
