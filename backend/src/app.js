
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Güvenlik middleware'leri
app.use(helmet());

// CORS ayarları
const allowedOrigins = ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

// Genel middleware'ler
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Authentication Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Bulunamayan adresler için 404
app.use((req, res, next) => {
  const error = new Error('İstenen kaynak bulunamadı.');
  error.statusCode = 404;
  next(error);
});

// Merkezi hata yönetimi
app.use(errorMiddleware);

module.exports = app;
