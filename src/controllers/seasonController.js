
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { createCrudController } = require('../utils/crudFactory');

// Validaciones para temporadas
const seasonValidation = [
  body('nombre')
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre de la temporada es requerido y debe tener máximo 100 caracteres')
    .trim(),
  
  body('año')
    .isInt({ min: 2020, max: 2050 })
    .withMessage('El año debe estar entre 2020 y 2050'),
  
  body('fecha_inicio')
    .isISO8601()
    .withMessage('Debe proporcionar una fecha de inicio válida'),
  
  body('fecha_fin')
    .isISO8601()
    .withMessage('Debe proporcionar una fecha de fin válida')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.fecha_inicio)) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
      return true;
    }),
  
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción debe tener máximo 500 caracteres')
];

// Usar CRUD básico como base
const baseCrud = createCrudController('temporadas', 'id_temporada');

// Obtener todas las temporadas
const getAllSeasons = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, active } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [limit, offset];
    
    if (active === 'true') {
      whereClause = 'WHERE activa = true';
    }

    const result = await query(
      `SELECT * FROM temporadas ${whereClause} ORDER BY año DESC, fecha_inicio DESC LIMIT $1 OFFSET $2`,
      params
    );

    const countQuery = active === 'true' ? 
      'SELECT COUNT(*) FROM temporadas WHERE activa = true' : 
      'SELECT COUNT(*) FROM temporadas';
    
    const countResult = await query(countQuery);
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

// Obtener temporada activa
const getActiveSeason = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM temporadas WHERE activa = true');
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay temporada activa'
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

// Crear temporada
const createSeason = async (req, res, next) => {
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

// Activar temporada
// const activateSeason = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // Verificar que la temporada existe
//     const seasonResult = await query('SELECT * FROM temporadas WHERE id_temporada = $1', [id]);
    
//     if (seasonResult.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Temporada no encontrada'
//       });
//     }

//     // Desactivar todas las temporadas y activar la seleccionada
//     await query('UPDATE temporadas SET activa = false');
//     const result = await query(
//       'UPDATE temporadas SET activa = true WHERE id_temporada = $1 RETURNING *',
//       [id]
//     );

//     res.json({
//       success: true,
//       message: 'Temporada activada exitosamente',
//       data: result.rows[0]
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// Activar temporada
// const activateSeason = async (req, res, next) => {
//   try {
//     const { id } = req.params;

//     // Verificar que la temporada existe
//     const seasonResult = await query('SELECT * FROM temporadas WHERE id_temporada = $1', [id]);
//     if (seasonResult.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Temporada no encontrada'
//       });
//     }

//     // Activar la temporada seleccionada y desactivar todas las demás
//     const result = await query(
//       `UPDATE temporadas 
//        SET activa = (id_temporada = $1)
//        RETURNING *`,
//       [id]
//     );

//     res.json({
//       success: true,
//       message: 'Temporada activada exitosamente',
//       data: result.rows.find(r => r.id_temporada == id) // devuelve solo la activada
//     });
//   } catch (error) {
//     next(error);
//   }
// };


// Activar temporada
const activateSeason = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar que la temporada existe
    const seasonResult = await query(
      'SELECT * FROM temporadas WHERE id_temporada = $1',
      [id]
    );
    if (seasonResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Temporada no encontrada'
      });
    }

    // Activar la temporada elegida y desactivar todas las demás en una sola query
    const result = await query(
      `UPDATE temporadas
       SET activa = (id_temporada = $1)
       RETURNING *`,
      [id]
    );

    // Devolver solo la temporada activada
    const activeSeason = result.rows.find(r => r.id_temporada == id);

    res.json({
      success: true,
      message: 'Temporada activada exitosamente',
      data: activeSeason
    });
  } catch (error) {
    next(error);
  }
};




// Obtener tabla de clasificación de la temporada
const getSeasonStandings = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT tc.*, e.nombre as equipo_nombre, e.nombre_corto, e.logo_url
       FROM tabla_clasificacion tc
       JOIN equipos e ON tc.id_equipo = e.id_equipo
       WHERE tc.id_temporada = $1
       ORDER BY tc.posicion`,
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

// Obtener estadísticas de la temporada
const getSeasonStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Estadísticas generales
    const statsResult = await query(
      `SELECT 
         COUNT(DISTINCT e.id_equipo) as total_equipos,
         COUNT(DISTINCT j.id_jugador) as total_jugadores,
         COUNT(DISTINCT p.id_partido) as total_partidos,
         COUNT(DISTINCT CASE WHEN p.estado = 'FINALIZADO' THEN p.id_partido END) as partidos_finalizados,
         COALESCE(SUM(p.goles_local + p.goles_visitante), 0) as total_goles
       FROM temporadas t
       LEFT JOIN jornadas jo ON t.id_temporada = jo.id_temporada
       LEFT JOIN partidos p ON jo.id_jornada = p.id_jornada
       LEFT JOIN estadisticas_equipo ee ON t.id_temporada = ee.id_temporada
       LEFT JOIN equipos e ON ee.id_equipo = e.id_equipo
       LEFT JOIN jugadores j ON e.id_equipo = j.id_equipo AND j.activo = true
       WHERE t.id_temporada = $1`,
      [id]
    );

    // Máximo goleador
    const topScorerResult = await query(
      `SELECT ej.goles, j.nombre, j.apellido, e.nombre as equipo_nombre
       FROM estadisticas_jugador ej
       JOIN jugadores j ON ej.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE ej.id_temporada = $1
       ORDER BY ej.goles DESC, ej.asistencias DESC
       LIMIT 1`,
      [id]
    );

    const stats = statsResult.rows[0];
    const topScorer = topScorerResult.rows[0] || null;

    res.json({
      success: true,
      data: {
        ...stats,
        top_scorer: topScorer
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSeasons,
  getSeasonById: baseCrud.getById,
  getActiveSeason,
  createSeason,
  updateSeason: baseCrud.update,
  deleteSeason: baseCrud.delete,
  activateSeason,
  getSeasonStandings,
  getSeasonStats,
  seasonValidation
};
