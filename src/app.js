require('dotenv').config();
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const path = require('path');
const redisClient = require('./config/redis');

const app = express();

// Connect to Redis before starting
redisClient.connect().catch((err) => {
  console.error('[Redis] Initial connection failed:', err);
});

// Sessions stored in Redis = stateless web tier (horizontal scaling ready)
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'myclothes-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/user', require('./routes/user'));

// Health check — used by ALB target group & ECS health checks
app.get('/health', async (req, res) => {
  const checks = { status: 'healthy', timestamp: new Date().toISOString() };
  try {
    await redisClient.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
    checks.status = 'degraded';
  }
  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[App] MyClothes.com running on port ${PORT}`);
  console.log(`[App] Environment: ${process.env.NODE_ENV || 'development'}`);
});
