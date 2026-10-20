require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const aiRoutes = require('./routes/ai');
const walletRoutes = require('./routes/wallet');
const projectRoutes = require('./routes/projects');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Skill & Service API' }));
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/projects', projectRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err && err.code === 11000) return res.status(409).json({ message: 'A record with that unique value already exists.' });
  if (err && err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : (err.message || 'Internal server error.') });
});

const port = Number(process.env.PORT) || 3000;
connectDB().then(() => app.listen(port, () => console.log(`Skill & Service API listening on port ${port}`)))
  .catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
