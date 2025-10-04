
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { createCrudController } = require('../utils/crudFactory');

// Validaciones para partidos
const matchValidation = [
  body('id_jornada')
    .isInt({ min: 1 })
    .withMessage('ID de jornada válido es requerido'),
  
  body('id_equipo_local')
    .isInt({ min: 1 })
    .withMessage('ID de equipo local válido es requerido'),
  
  body('id_equipo_visitante')
    .isInt({ min: 1 })
    .withMessage('ID de equipo visitante válido es requerido')
    .custom((value, { req }) => {
      if (value === req.body.id_equipo_local) {
        throw new Error('El equipo local y visitante deben ser diferentes');
      }
      return true;
    }),
  
  body('fecha_partido')
    .isISO8601()
    .withMessage('Debe proporcionar una fecha y hora válida para el partido'),
  
  body('estadio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El nombre del estadio debe tener máximo 100 caracteres'),
  
  body('id_arbitro')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de árbitro debe ser válido'),
  
  body('estado')
    .optional()
    .isIn(['PROGRAMADO', 'EN_CURSO', 'FINALIZADO', 'SUSPENDIDO', 'CANCELADO'])
    .withMessage('Estado debe ser: PROGRAMADO, EN_CURSO, FINALIZADO, SUSPENDIDO o CANCELADO')
];

// Usar CRUD básico como base
const baseCrud = createCrudController('partidos', 'id_partido');

// Obtener todos los partidos con información adicional
const getAllMatches = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      season, 
      team, 
      status, 
      date_from, 
      date_to 
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [limit, offset];
    let paramIndex = 3;

    // Filtros
    if (season) {
      whereConditions.push(`t.id_temporada = $${paramIndex}`);
      params.push(season);
      paramIndex++;
    }

    if (team) {
      whereConditions.push(`(p.id_equipo_local = $${paramIndex} OR p.id_equipo_visitante = $${paramIndex})`);
      params.push(team);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`p.estado = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (date_from) {
      whereConditions.push(`p.fecha_partido >= $${paramIndex}`);
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      whereConditions.push(`p.fecha_partido <= $${paramIndex}`);
      params.push(date_to);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT p.*, 
              j.numero_jornada, j.nombre as jornada_nombre,
              t.id_temporada as id_temporada,
              t.activa as temporada_activa,
              t.nombre as temporada_nombre,
              el.nombre as equipo_local_nombre, el.nombre_corto as equipo_local_corto, el.logo_url as equipo_local_logo,
              ev.nombre as equipo_visitante_nombre, ev.nombre_corto as equipo_visitante_corto, ev.logo_url as equipo_visitante_logo,
              u.nombre as arbitro_nombre, u.apellido as arbitro_apellido
       FROM partidos p
       JOIN jornadas j ON p.id_jornada = j.id_jornada
       JOIN temporadas t ON j.id_temporada = t.id_temporada
       JOIN equipos el ON p.id_equipo_local = el.id_equipo
       JOIN equipos ev ON p.id_equipo_visitante = ev.id_equipo
       LEFT JOIN usuarios u ON p.id_arbitro = u.id_usuario
       ${whereClause}
       ORDER BY p.fecha_partido DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    // Contar total con las mismas condiciones
    const countParams = params.slice(2); // Remover limit y offset
    const countResult = await query(
      `SELECT COUNT(*) FROM partidos p
       JOIN jornadas j ON p.id_jornada = j.id_jornada
       JOIN temporadas t ON j.id_temporada = t.id_temporada
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

// Obtener partido por ID con información completa
const getMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*, 
              j.numero_jornada, j.nombre as jornada_nombre,
              t.id_temporada as id_temporada,
              t.activa as temporada_activa,
              t.nombre as temporada_nombre,
              el.nombre as equipo_local_nombre, el.nombre_corto as equipo_local_corto, el.logo_url as equipo_local_logo,
              ev.nombre as equipo_visitante_nombre, ev.nombre_corto as equipo_visitante_corto, ev.logo_url as equipo_visitante_logo,
              u.nombre as arbitro_nombre, u.apellido as arbitro_apellido
       FROM partidos p
       JOIN jornadas j ON p.id_jornada = j.id_jornada
       JOIN temporadas t ON j.id_temporada = t.id_temporada
       JOIN equipos el ON p.id_equipo_local = el.id_equipo
       JOIN equipos ev ON p.id_equipo_visitante = ev.id_equipo
       LEFT JOIN usuarios u ON p.id_arbitro = u.id_usuario
       WHERE p.id_partido = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partido no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Crear partido
const createMatch = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    await baseCrud.create(req, res, next);
  } catch (error) {
    next(error);
  }
};

// Obtener próximos partidos
const getUpcomingMatches = async (req, res, next) => {
  try {
    const { limit = 10, team } = req.query;
    let params = [limit];
    let teamCondition = '';

    if (team) {
      teamCondition = 'AND (p.id_equipo_local = $2 OR p.id_equipo_visitante = $2)';
      params.push(team);
    }

    const result = await query(
      `SELECT p.*, 
              j.numero_jornada,
              el.nombre as equipo_local_nombre, el.nombre_corto as equipo_local_corto,
              ev.nombre as equipo_visitante_nombre, ev.nombre_corto as equipo_visitante_corto
       FROM partidos p
       JOIN jornadas j ON p.id_jornada = j.id_jornada
       JOIN equipos el ON p.id_equipo_local = el.id_equipo
       JOIN equipos ev ON p.id_equipo_visitante = ev.id_equipo
       WHERE p.fecha_partido > CURRENT_TIMESTAMP 
       AND p.estado = 'PROGRAMADO'
       ${teamCondition}
       ORDER BY p.fecha_partido ASC
       LIMIT $1`,
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

// Obtener eventos del partido
const getMatchEvents = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT ep.*, 
              j.nombre as jugador_nombre, j.apellido as jugador_apellido, j.numero_camiseta,
              e.nombre as equipo_nombre,
              ja.nombre as asistencia_nombre, ja.apellido as asistencia_apellido
       FROM eventos_partido ep
       JOIN jugadores j ON ep.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       LEFT JOIN jugadores ja ON ep.id_jugador_asistencia = ja.id_jugador
       WHERE ep.id_partido = $1
       ORDER BY ep.minuto ASC, ep.fecha_registro ASC`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar resultado del partido
const updateMatchResult = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { goles_local, goles_visitante, estado } = req.body;

    if (goles_local < 0 || goles_visitante < 0) {
      return res.status(400).json({
        success: false,
        message: 'Los goles no pueden ser negativos'
      });
    }

    const result = await query(
      `UPDATE partidos 
       SET goles_local = $1, goles_visitante = $2, estado = $3
       WHERE id_partido = $4 
       RETURNING *`,
      [goles_local, goles_visitante, estado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partido no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Resultado actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch: baseCrud.update,
  deleteMatch: baseCrud.delete,
  getUpcomingMatches,
  getMatchEvents,
  updateMatchResult,
  matchValidation
};
