
const { body, validationResult } = require('express-validator');
const Player = require('../models/Player');
const { createCrudController } = require('../utils/crudFactory');

// Validaciones para jugadores
const playerValidation = [
  body('id_equipo')
    .isInt({ min: 1 })
    .withMessage('ID de equipo válido es requerido'),
  
  body('numero_camiseta')
    .isInt({ min: 1, max: 99 })
    .withMessage('El número de camiseta debe estar entre 1 y 99'),
  
  body('nombre')
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre es requerido y debe tener máximo 100 caracteres')
    .trim(),
  
  body('apellido')
    .isLength({ min: 1, max: 100 })
    .withMessage('El apellido es requerido y debe tener máximo 100 caracteres')
    .trim(),
  
  body('fecha_nacimiento')
    .isISO8601()
    .withMessage('Debe proporcionar una fecha de nacimiento válida')
    .custom((value) => {
      const birthDate = new Date(value);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 15);
      
      if (birthDate > minAge) {
        throw new Error('El jugador debe tener al menos 15 años');
      }
      return true;
    }),
  
  body('posicion')
    .isIn(['PORTERO', 'DEFENSA', 'MEDIOCAMPISTA', 'DELANTERO'])
    .withMessage('La posición debe ser: PORTERO, DEFENSA, MEDIOCAMPISTA o DELANTERO'),
  
  body('peso')
    .optional()
    .isFloat({ min: 40, max: 150 })
    .withMessage('El peso debe estar entre 40 y 150 kg'),
  
  body('altura')
    .optional()
    .isFloat({ min: 1.40, max: 2.20 })
    .withMessage('La altura debe estar entre 1.40 y 2.20 metros'),
  
  body('pie_habil')
    .optional()
    .isIn(['DERECHO', 'IZQUIERDO', 'AMBIDIESTRO'])
    .withMessage('El pie hábil debe ser: DERECHO, IZQUIERDO o AMBIDIESTRO'),
  
  body('nacionalidad')
    .optional()
    .isLength({ max: 50 })
    .withMessage('La nacionalidad debe tener máximo 50 caracteres'),
  
  body('documento_identidad')
    .optional()
    .isLength({ max: 20 })
    .withMessage('El documento de identidad debe tener máximo 20 caracteres'),
  
  body('telefono')
    .optional()
    .isMobilePhone('es-CO')
    .withMessage('Debe proporcionar un número de teléfono válido'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail()
];

// Usar CRUD básico como base
const baseCrud = createCrudController('jugadores', 'id_jugador');

// Obtener todos los jugadores con filtros
const getAllPlayers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, team, position } = req.query;
    
    const result = await Player.getAll(page, limit, team, position);
    
    res.json({
      success: true,
      data: result.players,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

// Obtener jugador por ID
const getPlayerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const player = await Player.findById(id);
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Jugador no encontrado'
      });
    }

    res.json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// Obtener jugadores por equipo
const getPlayersByTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const players = await Player.getByTeam(teamId);
    
    res.json({
      success: true,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

// Crear jugador
const createPlayer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { id_equipo, numero_camiseta } = req.body;

    // Verificar que el número de camiseta no esté ocupado
    const isJerseyTaken = await Player.checkJerseyNumber(id_equipo, numero_camiseta);
    if (isJerseyTaken) {
      return res.status(400).json({
        success: false,
        message: `El número de camiseta ${numero_camiseta} ya está ocupado en este equipo`
      });
    }

    const player = await Player.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Jugador creado exitosamente',
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar jugador
const updatePlayer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { id_equipo, numero_camiseta } = req.body;

    // Si se está actualizando el número de camiseta, verificar disponibilidad
    if (numero_camiseta) {
      const isJerseyTaken = await Player.checkJerseyNumber(id_equipo, numero_camiseta, id);
      if (isJerseyTaken) {
        return res.status(400).json({
          success: false,
          message: `El número de camiseta ${numero_camiseta} ya está ocupado en este equipo`
        });
      }
    }

    // Usar el método update del CRUD base
    await baseCrud.update(req, res, next);
  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas del jugador
const getPlayerStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { seasonId } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    const stats = await Player.getPlayerStats(id, seasonId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Estadísticas no encontradas para esta temporada'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Obtener tabla de goleadores
const getTopScorers = async (req, res, next) => {
  try {
    const { seasonId, limit = 10 } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    const scorers = await Player.getTopScorers(seasonId, limit);
    
    res.json({
      success: true,
      data: scorers
    });
  } catch (error) {
    next(error);
  }
};

// Buscar jugadores por nombre
const searchPlayers = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    const players = await Player.searchByName(q.trim(), limit);
    
    res.json({
      success: true,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPlayers,
  getPlayerById,
  getPlayersByTeam,
  createPlayer,
  updatePlayer,
  deletePlayer: baseCrud.delete,
  getPlayerStats,
  getTopScorers,
  searchPlayers,
  playerValidation
};
