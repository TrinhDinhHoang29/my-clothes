const express = require('express');
const db = require('../config/database');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

router.get('/profile', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.put('/profile', async (req, res) => {
  const { firstName, lastName } = req.body;
  try {
    await db.execute('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?', [
      firstName || '',
      lastName || '',
      req.session.userId,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/addresses', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id ASC',
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get addresses' });
  }
});

router.post('/addresses', async (req, res) => {
  const { street, city, state, postalCode, country, isDefault } = req.body;
  if (!street || !city || !country) {
    return res.status(400).json({ error: 'Street, city, and country are required' });
  }
  try {
    if (isDefault) {
      await db.execute('UPDATE addresses SET is_default = false WHERE user_id = ?', [
        req.session.userId,
      ]);
    }
    const [result] = await db.execute(
      'INSERT INTO addresses (user_id, street, city, state, postal_code, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.session.userId, street, city, state || '', postalCode || '', country, isDefault ? 1 : 0]
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add address' });
  }
});

router.put('/addresses/:id', async (req, res) => {
  const { street, city, state, postalCode, country, isDefault } = req.body;
  if (!street || !city || !country) {
    return res.status(400).json({ error: 'Street, city, and country are required' });
  }
  try {
    if (isDefault) {
      await db.execute('UPDATE addresses SET is_default = false WHERE user_id = ?', [
        req.session.userId,
      ]);
    }
    const [result] = await db.execute(
      'UPDATE addresses SET street=?, city=?, state=?, postal_code=?, country=?, is_default=? WHERE id=? AND user_id=?',
      [street, city, state || '', postalCode || '', country, isDefault ? 1 : 0, req.params.id, req.session.userId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Address not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update address' });
  }
});

router.delete('/addresses/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM addresses WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

module.exports = router;
