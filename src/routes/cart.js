const express = require('express');
const redisClient = require('../config/redis');
const db = require('../config/database');

const router = express.Router();
const CART_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// Cart key: prefer userId (persists across sessions) else sessionID (guest cart)
const getCartKey = (req) =>
  req.session && req.session.userId
    ? `cart:user:${req.session.userId}`
    : `cart:session:${req.sessionID}`;

router.get('/', async (req, res) => {
  try {
    const cartData = await redisClient.get(getCartKey(req));
    const cart = cartData ? JSON.parse(cartData) : [];

    if (!cart.length) return res.json([]);

    const ids = cart.map((i) => i.productId);
    const placeholders = ids.map(() => '?').join(',');
    const [products] = await db.execute(
      `SELECT * FROM products WHERE id IN (${placeholders})`,
      ids
    );
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    const enriched = cart
      .map((item) => ({ ...item, product: productMap[item.productId] || null }))
      .filter((item) => item.product);

    res.json(enriched);
  } catch (err) {
    console.error('[Cart] Get error:', err);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

router.post('/add', async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });

  try {
    const [products] = await db.execute(
      'SELECT id, stock FROM products WHERE id = ? AND stock > 0',
      [productId]
    );
    if (!products.length) {
      return res.status(404).json({ error: 'Product not found or out of stock' });
    }

    const cartKey = getCartKey(req);
    const cartData = await redisClient.get(cartKey);
    const cart = cartData ? JSON.parse(cartData) : [];

    const existing = cart.find((i) => i.productId === parseInt(productId));
    if (existing) {
      existing.quantity = Math.min(existing.quantity + parseInt(quantity), products[0].stock);
    } else {
      cart.push({ productId: parseInt(productId), quantity: parseInt(quantity) });
    }

    await redisClient.setEx(cartKey, CART_TTL, JSON.stringify(cart));
    const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    res.json({ success: true, cartCount });
  } catch (err) {
    console.error('[Cart] Add error:', err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

router.put('/update', async (req, res) => {
  const { productId, quantity } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId is required' });

  try {
    const cartKey = getCartKey(req);
    const cartData = await redisClient.get(cartKey);
    let cart = cartData ? JSON.parse(cartData) : [];

    if (parseInt(quantity) <= 0) {
      cart = cart.filter((i) => i.productId !== parseInt(productId));
    } else {
      const item = cart.find((i) => i.productId === parseInt(productId));
      if (item) item.quantity = parseInt(quantity);
    }

    await redisClient.setEx(cartKey, CART_TTL, JSON.stringify(cart));
    res.json({ success: true, cartCount: cart.reduce((sum, i) => sum + i.quantity, 0) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

router.delete('/remove/:productId', async (req, res) => {
  try {
    const cartKey = getCartKey(req);
    const cartData = await redisClient.get(cartKey);
    let cart = cartData ? JSON.parse(cartData) : [];
    cart = cart.filter((i) => i.productId !== parseInt(req.params.productId));
    await redisClient.setEx(cartKey, CART_TTL, JSON.stringify(cart));
    res.json({ success: true, cartCount: cart.reduce((sum, i) => sum + i.quantity, 0) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    await redisClient.del(getCartKey(req));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
