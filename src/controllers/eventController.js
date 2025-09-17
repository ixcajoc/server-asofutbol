
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { createCrudController } = require('../utils/crudFactory');

// Validaciones para eventos
const eventValidation = [
  body('id_partido')
    .isInt({ min: 1 })
    .withMessage('ID de partido válido es requerido'),
  
  body('id_jugador')
    .isInt({ min: 1 })
    .withMessage('ID de jugador válido es requerido'),
  
  body('tipo_evento')
    .isIn(['GOL', 'ASISTENCIA', 'TARJETA_AMARILLA', 'TARJETA_ROJA', 'SUSTITUCION'])
    .withMessage('Tipo de evento debe ser: GOL, ASISTENCIA, TARJETA_AMARILLA, TARJETA_ROJA o SUSTITUCION'),
  
  body('minuto')
    .isInt({ min: 0, max: 120 })
    .withMessage('El minuto debe estar entre 0 y 120'),
  
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción debe tener máximo 500 caracteres'),
  
  body('id_jugador_asistencia')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de jugador de asistencia debe ser válido')
    .custom((value, { req }) => {
      if (value && value === req.body.id_jugador) {
        throw new Error('El jugador que anota y el que asiste deben ser diferentes');
      }
      return true;
    })
];

// Usar CRUD básico como base
const baseCrud = createCrudController('eventos_partido', 'id_evento');

// Obtener todos los eventos con información adicional
const getAllEvents = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      match, 
      player, 
      type, 
      season 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [limit, offset];
    let paramIndex = 3;

    // Filtros
    if (match) {
      whereConditions.push(`ep.id_partido = $${paramIndex}`);
      params.push(match);
      paramIndex++;
    }

    if (player) {
      whereConditions.push(`ep.id_jugador = $${paramIndex}`);
      params.push(player);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`ep.tipo_evento = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (season) {
      whereConditions.push(`t.id_temporada = $${paramIndex}`);
      params.push(season);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT ep.*, 
              j.nombre as jugador_nombre, j.apellido as jugador_apellido, j.numero_camiseta,
              e.nombre as equipo_nombre, e.nombre_corto as equipo_nombre_corto,
              ja.nombre as asistencia_nombre, ja.apellido as asistencia_apellido,
              p.fecha_partido,
              el.nombre as equipo_local, ev.nombre as equipo_visitante
       FROM eventos_partido ep
       JOIN jugadores j ON ep.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       JOIN partidos p ON ep.id_partido = p.id_partido
       JOIN equipos el ON p.id_equipo_local = el.id_equipo
       JOIN equipos ev ON p.id_equipo_visitante = ev.id_equipo
       JOIN jornadas jo ON p.id_jornada = jo.id_jornada
       JOIN temporadas t ON jo.id_temporada = t.id_temporada
       LEFT JOIN jugadores ja ON ep.id_jugador_asistencia = ja.id_jugador
       ${whereClause}
       ORDER BY p.fecha_partido DESC, ep.minuto ASC
       LIMIT $1 OFFSET $2`,
      params
    );

    // Contar total con las mismas condiciones
    const countParams = params.slice(2); // Remover limit y offset
    const countResult = await query(
      `SELECT COUNT(*) FROM eventos_partido ep
       JOIN jugadores j ON ep.id_jugador = j.id_jugador
       JOIN partidos p ON ep.id_partido = p.id_partido
       JOIN jornadas jo ON p.id_jornada = jo.id_jornada
       JOIN temporadas t ON jo.id_temporada = t.id_temporada
       ${whereClause}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Crear evento
const createEvent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { id_partido, id_jugador, tipo_evento } = req.body;

    // Verificar que el partido existe y está en curso o finalizado
    const matchResult = await query(
      'SELECT estado FROM partidos WHERE id_partido = $1',
      [id_partido]
    );

    if (matchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partido no encontrado'
      });
    }

    const matchStatus = matchResult.rows[0].estado;
    if (!['EN_CURSO', 'FINALIZADO'].includes(matchStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden registrar eventos en partidos en curso o finalizados'
      });
    }

    // Verificar que el jugador pertenece a uno de los equipos del partido
    const playerTeamResult = await query(
      `SELECT j.id_equipo FROM jugadores j
       JOIN partidos p ON (j.id_equipo = p.id_equipo_local OR j.id_equipo = p.id_equipo_visitante)
       WHERE j.id_jugador = $1 AND p.id_partido = $2`,
      [id_jugador, id_partido]
    );

    if (playerTeamResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El jugador no pertenece a ninguno de los equipos de este partido'
      });
    }

    await baseCrud.create(req, res, next);
  } catch (error) {
    next(error);
  }
};

// Obtener eventos por partido
const getEventsByMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const result = await query(
      `SELECT ep.*, 
              j.nombre as jugador_nombre, j.apellido as jugador_apellido, j.numero_camiseta,
              e.nombre as equipo_nombre, e.nombre_corto as equipo_nombre_corto,
              ja.nombre as asistencia_nombre, ja.apellido as asistencia_apellido
       FROM eventos_partido ep
       JOIN jugadores j ON ep.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       LEFT JOIN jugadores ja ON ep.id_jugador_asistencia = ja.id_jugador
       WHERE ep.id_partido = $1
       ORDER BY ep.minuto ASC, ep.fecha_registro ASC`,
      [matchId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Obtener eventos por jugador
const getEventsByPlayer = async (req, res, next) => {
  try {
    const { playerId } = req.params;
    const { season, type } = req.query;

    let whereConditions = ['ep.id_jugador = $1'];
    let params = [playerId];
    let paramIndex = 2;

    if (season) {
      whereConditions.push(`t.id_temporada = $${paramIndex}`);
      params.push(season);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`ep.tipo_evento = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const result = await query(
      `SELECT ep.*, 
              p.fecha_partido,
              el.nombre as equipo_local, ev.nombre as equipo_visitante,
              p.goles_local, p.goles_visitante,
              ja.nombre as asistencia_nombre, ja.apellido as asistencia_apellido
       FROM eventos_partido ep
       JOIN partidos p ON ep.id_partido = p.id_partido
       JOIN equipos el ON p.id_equipo_local = el.id_equipo
       JOIN equipos ev ON p.id_equipo_visitante = ev.id_equipo
       JOIN jornadas jo ON p.id_jornada = jo.id_jornada
       JOIN temporadas t ON jo.id_temporada = t.id_temporada
       LEFT JOIN jugadores ja ON ep.id_jugador_asistencia = ja.id_jugador
       ${whereClause}
       ORDER BY p.fecha_partido DESC, ep.minuto ASC`,
      params
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEvents,
  getEventById: baseCrud.getById,
  createEvent,
  updateEvent: baseCrud.update,
  deleteEvent: baseCrud.delete,
  getEventsByMatch,
  getEventsByPlayer,
  eventValidation
};
