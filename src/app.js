
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana de tiempo
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo en 15 minutos.'
  }
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Parseo de JSON y URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (fotos de perfil, logos, etc.)
app.use('/uploads', express.static('uploads'));

// Rutas principales
app.use('/api', routes);

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Documentación básica
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'ASOFÚTBOL API',
    version: '1.0.0',
    description: 'API REST para sistema de gestión de ligas de fútbol',
    endpoints: {
      auth: '/api/auth (POST /login, POST /register)',
      users: '/api/users (GET, POST, PUT, DELETE)',
      teams: '/api/teams (GET, POST, PUT, DELETE)',
      players: '/api/players (GET, POST, PUT, DELETE)',
      seasons: '/api/seasons (GET, POST, PUT, DELETE)',
      matches: '/api/matches (GET, POST, PUT, DELETE)',
      events: '/api/events (GET, POST, PUT, DELETE)',
      reports: '/api/reports (GET)',
      search: '/api/search (GET)',
      upload: '/api/upload (POST)'
    },
    documentation: 'https://github.com/asofutbol/api-docs'
  });
});

// Middleware de manejo de errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
