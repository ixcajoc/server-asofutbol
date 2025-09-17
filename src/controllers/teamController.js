
const { body, validationResult } = require('express-validator');
const Team = require('../models/Team');
const { createCrudController } = require('../utils/crudFactory');

// Validaciones para equipos
const teamValidation = [
  body('nombre')
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre del equipo es requerido y debe tener máximo 100 caracteres')
    .trim(),
  
  body('nombre_corto')
    .isLength({ min: 1, max: 20 })
    .withMessage('El nombre corto es requerido y debe tener máximo 20 caracteres')
    .trim(),
  
  body('color_principal')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('El color principal debe ser un código hexadecimal válido'),
  
  body('color_secundario')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('El color secundario debe ser un código hexadecimal válido'),
  
  body('fecha_fundacion')
    .optional()
    .isISO8601()
    .withMessage('Debe proporcionar una fecha de fundación válida'),
  
  body('estadio')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El nombre del estadio debe tener máximo 100 caracteres'),
  
  body('entrenador')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El nombre del entrenador debe tener máximo 100 caracteres')
];

// Usar CRUD básico como base
const baseCrud = createCrudController('equipos', 'id_equipo');

// Obtener todos los equipos con información adicional
const getAllTeams = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, active } = req.query;
    const activeOnly = active === 'true';
    
    const result = await Team.getAll(page, limit, activeOnly);
    
    res.json({
      success: true,
      data: result.teams,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

// Obtener equipo por ID con información adicional
const getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const team = await Team.findById(id);
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Equipo no encontrado'
      });
    }

    // Obtener número de jugadores
    const playersCount = await Team.getPlayersCount(id);
    
    res.json({
      success: true,
      data: {
        ...team,
        total_jugadores: playersCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Crear equipo
const createTeam = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const team = await Team.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Equipo creado exitosamente',
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// Obtener estadísticas del equipo
const getTeamStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { seasonId } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    const stats = await Team.getTeamStats(id, seasonId);
    
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

// Buscar equipos por nombre
const searchTeams = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    const teams = await Team.searchByName(q.trim(), limit);
    
    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam: baseCrud.update,
  deleteTeam: baseCrud.delete,
  getTeamStats,
  searchTeams,
  teamValidation
};
