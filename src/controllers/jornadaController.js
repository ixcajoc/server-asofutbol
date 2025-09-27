const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { createCrudController } = require('../utils/crudFactory');

// Validaciones para jornadas
const jornadaValidation = [
  body('id_temporada')
    .isInt({ min: 1 })
    .withMessage('ID de temporada válido es requerido'),

  body('numero_jornada')
    .isInt({ min: 1 })
    .withMessage('Número de jornada válido es requerido'),

  body('nombre')
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre de la jornada es requerido y debe tener máximo 100 caracteres'),

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

  body('completada')
    .isBoolean()
    .withMessage('El campo completada debe ser booleano'),

  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción debe tener máximo 500 caracteres')
];

// Usa el CRUD base
const baseCrud = createCrudController('jornadas', 'id_jornada');

// Obtener todas las jornadas
const getAllJornadas = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT * FROM jornadas ORDER BY id_jornada DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM jornadas');
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

// Crear jornada
const createJornada = async (req, res, next) => {
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

module.exports = {
  getAllJornadas,
  getJornadaById: baseCrud.getById,
  createJornada,
  updateJornada: baseCrud.update,
  deleteJornada: baseCrud.delete,
  jornadaValidation
};