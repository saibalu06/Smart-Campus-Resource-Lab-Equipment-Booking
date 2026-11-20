import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { getDb } from '../db.ts';
import { authenticateToken, signAuthToken, type AuthenticatedRequest } from '../middleware/auth.ts';
import type { PublicUser, UserRole, UserRow } from '../types.ts';

const router = Router();

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    created_at: row.created_at,
  };
}

router.post('/register', (req, res) => {
  const { name, email, password, role, department } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    department?: string;
  };

  const trimmedName = (name ?? '').trim();
  const normalizedEmail = (email ?? '').trim().toLowerCase();
  const rawPassword = password ?? '';
  const selectedRole: UserRole = role === 'Lab Admin' ? 'Lab Admin' : 'Student';
  const trimmedDept = (department ?? '').trim() || 'Engineering';

  if (trimmedName.length < 2) {
    res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    return;
  }

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ error: 'Please enter a valid campus email address.' });
    return;
  }

  if (rawPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = bcrypt.hashSync(rawPassword, 10);
  const insertResult = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(trimmedName, normalizedEmail, passwordHash, selectedRole, trimmedDept);

  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(Number(insertResult.lastInsertRowid)) as UserRow;

  const publicUser = toPublicUser(userRow);
  const token = signAuthToken(publicUser);

  res.status(201).json({ token, user: publicUser });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const normalizedEmail = (email ?? '').trim().toLowerCase();
  const rawPassword = password ?? '';

  if (!normalizedEmail || !rawPassword) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const db = getDb();
  const userRow = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizedEmail) as UserRow | undefined;

  if (!userRow || !bcrypt.compareSync(rawPassword, userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const publicUser = toPublicUser(userRow);
  const token = signAuthToken(publicUser);

  res.json({ token, user: publicUser });
});

router.get('/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.user!.userId) as UserRow | undefined;

  if (!userRow) {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }

  res.json({ user: toPublicUser(userRow) });
});

export default router;
