
const express = require('express');
const router = express.Router();
const {
  getAllPlayers,
  getPlayerById,
  getPlayersByTeam,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerStats,
  getTopScorers,
  searchPlayers,
  playerValidation
} = require('../controllers/playerController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Rutas públicas (solo lectura)
router.get('/', getAllPlayers);
router.get('/search', searchPlayers);
router.get('/top-scorers', getTopScorers);
router.get('/team/:teamId', getPlayersByTeam);
router.get('/:id', getPlayerById);
router.get('/:id/stats', getPlayerStats);

// Rutas protegidas
router.post('/', 
  authenticateToken, 
  requirePermission('create'), 
  playerValidation, 
  createPlayer
);

router.put('/:id', 
  authenticateToken, 
  requirePermission('update'), 
  playerValidation, 
  updatePlayer
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR', 'ENTRENADOR']), 
  deletePlayer
);

module.exports = router;
