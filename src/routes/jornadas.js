const express = require('express');
const router = express.Router();
const {
  getAllJornadas,
  getJornadaById,
  createJornada,
  updateJornada,
  deleteJornada,
  jornadaValidation
} = require('../controllers/jornadaController');

const { authenticateToken, requireRole } = require('../middleware/auth');

// Rutas públicas
router.get('/', getAllJornadas);
router.get('/:id', getJornadaById);

// Rutas protegidas
router.post('/',
  authenticateToken,
  requireRole(['ADMINISTRADOR']),
  jornadaValidation,
  createJornada
);

router.put('/:id',
  authenticateToken,
  requireRole(['ADMINISTRADOR']),
  jornadaValidation,
  updateJornada
);

router.delete('/:id',
  authenticateToken,
  requireRole(['ADMINISTRADOR']),
  deleteJornada
);

module.exports = router;