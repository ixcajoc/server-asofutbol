
const express = require('express');
const router = express.Router();

// Importar todas las rutas
const authRoutes = require('./auth');
const userRoutes = require('./users');
const teamRoutes = require('./teams');
const playerRoutes = require('./players');
const seasonRoutes = require('./seasons');
const matchRoutes = require('./matches');
const eventRoutes = require('./events');
const reportRoutes = require('./reports');
const searchRoutes = require('./search');
const uploadRoutes = require('./upload');

// Montar las rutas
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/players', playerRoutes);
router.use('/seasons', seasonRoutes);
router.use('/matches', matchRoutes);
router.use('/events', eventRoutes);
router.use('/reports', reportRoutes);
router.use('/search', searchRoutes);
router.use('/upload', uploadRoutes);

// Ruta de información de la API
router.get('/', (req, res) => {
  res.json({
    name: 'ASOFÚTBOL API',
    version: '1.0.0',
    description: 'API REST para sistema de gestión de ligas de fútbol',
    status: 'active',
    endpoints: {
      auth: {
        description: 'Autenticación y autorización',
        routes: [
          'POST /api/auth/register - Registro de usuario',
          'POST /api/auth/login - Inicio de sesión',
          'GET /api/auth/profile - Perfil del usuario autenticado',
          'PUT /api/auth/change-password - Cambiar contraseña'
        ]
      },
      users: {
        description: 'Gestión de usuarios',
        routes: [
          'GET /api/users - Listar usuarios (Admin)',
          'GET /api/users/:id - Obtener usuario por ID',
          'POST /api/users - Crear usuario (Admin)',
          'PUT /api/users/:id - Actualizar usuario',
          'PUT /api/users/:id/role - Cambiar rol (Admin)',
          'DELETE /api/users/:id - Eliminar usuario (Admin)'
        ]
      },
      teams: {
        description: 'Gestión de equipos',
        routes: [
          'GET /api/teams - Listar equipos',
          'GET /api/teams/search - Buscar equipos',
          'GET /api/teams/:id - Obtener equipo por ID',
          'GET /api/teams/:id/stats - Estadísticas del equipo',
          'POST /api/teams - Crear equipo',
          'PUT /api/teams/:id - Actualizar equipo',
          'DELETE /api/teams/:id - Eliminar equipo (Admin)'
        ]
      },
      players: {
        description: 'Gestión de jugadores',
        routes: [
          'GET /api/players - Listar jugadores',
          'GET /api/players/search - Buscar jugadores',
          'GET /api/players/top-scorers - Tabla de goleadores',
          'GET /api/players/team/:teamId - Jugadores por equipo',
          'GET /api/players/:id - Obtener jugador por ID',
          'GET /api/players/:id/stats - Estadísticas del jugador',
          'POST /api/players - Crear jugador',
          'PUT /api/players/:id - Actualizar jugador',
          'DELETE /api/players/:id - Eliminar jugador'
        ]
      },
      seasons: {
        description: 'Gestión de temporadas',
        routes: [
          'GET /api/seasons - Listar temporadas',
          'GET /api/seasons/active - Temporada activa',
          'GET /api/seasons/:id - Obtener temporada por ID',
          'GET /api/seasons/:id/standings - Tabla de clasificación',
          'GET /api/seasons/:id/stats - Estadísticas de la temporada',
          'POST /api/seasons - Crear temporada (Admin)',
          'PUT /api/seasons/:id - Actualizar temporada (Admin)',
          'PUT /api/seasons/:id/activate - Activar temporada (Admin)',
          'DELETE /api/seasons/:id - Eliminar temporada (Admin)'
        ]
      },
      matches: {
        description: 'Gestión de partidos',
        routes: [
          'GET /api/matches - Listar partidos',
          'GET /api/matches/upcoming - Próximos partidos',
          'GET /api/matches/:id - Obtener partido por ID',
          'GET /api/matches/:id/events - Eventos del partido',
          'POST /api/matches - Crear partido (Admin)',
          'PUT /api/matches/:id - Actualizar partido',
          'PUT /api/matches/:id/result - Actualizar resultado',
          'DELETE /api/matches/:id - Eliminar partido (Admin)'
        ]
      },
      events: {
        description: 'Gestión de eventos de partido',
        routes: [
          'GET /api/events - Listar eventos',
          'GET /api/events/match/:matchId - Eventos por partido',
          'GET /api/events/player/:playerId - Eventos por jugador',
          'GET /api/events/:id - Obtener evento por ID',
          'POST /api/events - Crear evento (Árbitro/Admin)',
          'PUT /api/events/:id - Actualizar evento (Árbitro/Admin)',
          'DELETE /api/events/:id - Eliminar evento (Admin)'
        ]
      },
      reports: {
        description: 'Reportes y estadísticas',
        routes: [
          'GET /api/reports/standings - Tabla de clasificación',
          'GET /api/reports/scorers - Tabla de goleadores',
          'GET /api/reports/assists - Tabla de asistencias',
          'GET /api/reports/discipline - Reporte de disciplina',
          'GET /api/reports/team-stats - Estadísticas por equipo',
          'GET /api/reports/matchday - Partidos por jornada',
          'GET /api/reports/season-summary - Resumen de temporada'
        ]
      },
      search: {
        description: 'Búsquedas',
        routes: [
          'GET /api/search - Búsqueda general',
          'GET /api/search/teams - Buscar equipos',
          'GET /api/search/players - Buscar jugadores',
          'GET /api/search/matches - Buscar partidos'
        ]
      },
      upload: {
        description: 'Subida de archivos',
        routes: [
          'POST /api/upload/profile-photo - Subir foto de perfil',
          'POST /api/upload/team-logo/:teamId - Subir logo de equipo',
          'DELETE /api/upload/file/:filename - Eliminar archivo',
          'GET /api/upload/file/:filename/info - Información del archivo'
        ]
      }
    },
    documentation: 'https://github.com/asofutbol/api-docs',
    support: 'soporte@asofutbol.com'
  });
});

module.exports = router;
