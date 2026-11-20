import { Router } from 'express';
import { getDb } from '../db.ts';
import { authenticateToken, requireAdmin } from '../middleware/auth.ts';
import type { ResourceCategory, ResourceRow, ResourceStatus } from '../types.ts';

const router = Router();

const VALID_CATEGORIES: ResourceCategory[] = [
  'Electronics Lab',
  'Computing Lab',
  'Seminar Rooms',
];

const VALID_STATUSES: ResourceStatus[] = ['Available', 'In Use', 'Maintenance'];

function defaultImageForCategory(category: ResourceCategory): string {
  switch (category) {
    case 'Electronics Lab':
      return '/src/assets/images/electronics_oscilloscope_1795156019457.jpg';
    case 'Computing Lab':
      return '/src/assets/images/computing_cluster_1795156020726.jpg';
    case 'Seminar Rooms':
      return '/src/assets/images/seminar_hall_1795156020860.jpg';
  }
}

router.get('/', (req, res) => {
  const { category, status, search } = req.query as {
    category?: string;
    status?: string;
    search?: string;
  };

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (category && category !== 'All' && VALID_CATEGORIES.includes(category as ResourceCategory)) {
    conditions.push('category = ?');
    params.push(category);
  }

  if (status && status !== 'All' && VALID_STATUSES.includes(status as ResourceStatus)) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (search && search.trim()) {
    conditions.push('(name LIKE ? OR asset_code LIKE ? OR specs LIKE ? OR location LIKE ?)');
    const pattern = `%${search.trim()}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const db = getDb();

  const resources = db
    .prepare(`SELECT * FROM resources ${whereClause} ORDER BY category ASC, name ASC`)
    .all(...params) as ResourceRow[];

  res.json({ resources });
});

router.get('/:id', (req, res) => {
  const resourceId = Number(req.params.id);
  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    res.status(400).json({ error: 'Invalid resource ID.' });
    return;
  }

  const db = getDb();
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as
    | ResourceRow
    | undefined;

  if (!resource) {
    res.status(404).json({ error: 'Resource not found.' });
    return;
  }

  res.json({ resource });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const {
    name,
    asset_code,
    category,
    status,
    specs,
    location,
    max_duration_hours,
    image_url,
  } = req.body as Partial<ResourceRow>;

  const trimmedName = (name ?? '').trim();
  const trimmedCode = (asset_code ?? '').trim().toUpperCase();
  const trimmedSpecs = (specs ?? '').trim();
  const trimmedLocation = (location ?? '').trim();
  const duration = Number(max_duration_hours ?? 4);

  if (!trimmedName || !trimmedCode || !trimmedSpecs || !trimmedLocation) {
    res.status(400).json({ error: 'Name, asset code, specifications, and location are required.' });
    return;
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    res.status(400).json({ error: 'Invalid resource category.' });
    return;
  }

  const resolvedStatus: ResourceStatus =
    status && VALID_STATUSES.includes(status) ? status : 'Available';

  if (!Number.isInteger(duration) || duration < 1 || duration > 24) {
    res.status(400).json({ error: 'Max duration must be an integer between 1 and 24 hours.' });
    return;
  }

  const db = getDb();
  const duplicate = db.prepare('SELECT id FROM resources WHERE asset_code = ?').get(trimmedCode);
  if (duplicate) {
    res.status(409).json({ error: `Asset code ${trimmedCode} already exists.` });
    return;
  }

  const resolvedImage = (image_url ?? '').trim() || defaultImageForCategory(category);

  const info = db
    .prepare(
      `INSERT INTO resources (name, asset_code, category, status, specs, location, max_duration_hours, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      trimmedName,
      trimmedCode,
      category,
      resolvedStatus,
      trimmedSpecs,
      trimmedLocation,
      duration,
      resolvedImage
    );

  const created = db
    .prepare('SELECT * FROM resources WHERE id = ?')
    .get(Number(info.lastInsertRowid)) as ResourceRow;

  res.status(201).json({ resource: created });
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const resourceId = Number(req.params.id);
  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    res.status(400).json({ error: 'Invalid resource ID.' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as
    | ResourceRow
    | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Resource not found.' });
    return;
  }

  const {
    name,
    asset_code,
    category,
    status,
    specs,
    location,
    max_duration_hours,
    image_url,
  } = req.body as Partial<ResourceRow>;

  const nextName = name !== undefined ? name.trim() : existing.name;
  const nextCode = asset_code !== undefined ? asset_code.trim().toUpperCase() : existing.asset_code;
  const nextCategory =
    category !== undefined && VALID_CATEGORIES.includes(category) ? category : existing.category;
  const nextStatus =
    status !== undefined && VALID_STATUSES.includes(status) ? status : existing.status;
  const nextSpecs = specs !== undefined ? specs.trim() : existing.specs;
  const nextLocation = location !== undefined ? location.trim() : existing.location;
  const nextDuration =
    max_duration_hours !== undefined ? Number(max_duration_hours) : existing.max_duration_hours;
  const nextImage =
    image_url !== undefined && image_url.trim() ? image_url.trim() : existing.image_url;

  if (!nextName || !nextCode || !nextSpecs || !nextLocation) {
    res.status(400).json({ error: 'Name, asset code, specifications, and location cannot be empty.' });
    return;
  }

  if (!Number.isInteger(nextDuration) || nextDuration < 1 || nextDuration > 24) {
    res.status(400).json({ error: 'Max duration must be between 1 and 24 hours.' });
    return;
  }

  const codeConflict = db
    .prepare('SELECT id FROM resources WHERE asset_code = ? AND id != ?')
    .get(nextCode, resourceId);

  if (codeConflict) {
    res.status(409).json({ error: `Asset code ${nextCode} is already assigned to another resource.` });
    return;
  }

  db.prepare(
    `UPDATE resources
     SET name = ?, asset_code = ?, category = ?, status = ?, specs = ?, location = ?, max_duration_hours = ?, image_url = ?
     WHERE id = ?`
  ).run(
    nextName,
    nextCode,
    nextCategory,
    nextStatus,
    nextSpecs,
    nextLocation,
    nextDuration,
    nextImage,
    resourceId
  );

  const updated = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as ResourceRow;
  res.json({ resource: updated });
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const resourceId = Number(req.params.id);
  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    res.status(400).json({ error: 'Invalid resource ID.' });
    return;
  }

  const db = getDb();
  const info = db.prepare('DELETE FROM resources WHERE id = ?').run(resourceId);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Resource not found.' });
    return;
  }

  res.json({ deleted: true });
});

export default router;
