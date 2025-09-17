
const express = require('express');
const router = express.Router();
const {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamStats,
  searchTeams,
  teamValidation
} = require('../controllers/teamController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Rutas públicas (solo lectura)
router.get('/', getAllTeams);
router.get('/search', searchTeams);
router.get('/:id', getTeamById);
router.get('/:id/stats', getTeamStats);

// Rutas protegidas
router.post('/', 
  authenticateToken, 
  requirePermission('create'), 
  teamValidation, 
  createTeam
);

router.put('/:id', 
  authenticateToken, 
  requirePermission('update'), 
  teamValidation, 
  updateTeam
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  deleteTeam
);

module.exports = router;
