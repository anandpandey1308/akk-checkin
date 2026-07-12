const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ROLES = ['admin', 'checkin', 'display', 'doctor', 'filemanager'];

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user || !user.active) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.user = { id: user.id, name: user.name, username: user.username, role: user.role };
  res.json({ user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Failed to logout' });
    res.clearCookie('akk_checkin_session');
    res.json({ message: 'Logged out' });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// ── Self-service password change ─────────────────────────────
router.post('/change-my-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const db = getDb();
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!bcrypt.compareSync(current_password, me.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), me.id);
  res.json({ message: 'Password updated' });
});

// ── User management (admin only) ─────────────────────────────
router.get('/users', requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT id, name, username, role, active, created_at FROM users ORDER BY name ASC'
  ).all();
  res.json({ users });
});

router.post('/users', requireAdmin, (req, res) => {
  const { name, username, password, role } = req.body || {};
  if (!name || !username || !password || !role) {
    return res.status(400).json({ error: 'name, username, password, and role are required' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const db = getDb();
  const uname = username.trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(uname)) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(name, uname, hash, role);

  res.status(201).json({
    user: { id: result.lastInsertRowid, name, username: uname, role, active: 1 },
  });
});

router.patch('/users/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, role, active, password } = req.body || {};
  const updates = [];
  const params = {};

  if (name !== undefined) { updates.push('name = @name'); params.name = name; }
  if (role !== undefined) {
    if (!ROLES.includes(role)) return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    updates.push('role = @role'); params.role = role;
  }
  if (active !== undefined) {
    updates.push('active = @active'); params.active = active ? 1 : 0;
  }
  if (password !== undefined) {
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    updates.push('password_hash = @passwordHash'); params.passwordHash = bcrypt.hashSync(password, 10);
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.id = id;
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = @id`).run(params);

  const updated = db.prepare('SELECT id, name, username, role, active, created_at FROM users WHERE id = ?').get(id);
  res.json({ user: updated });
});

module.exports = router;
