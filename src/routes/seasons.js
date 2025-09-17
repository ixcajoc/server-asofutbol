
const express = require('express');
const router = express.Router();
const {
  getAllSeasons,
  getSeasonById,
  getActiveSeason,
  createSeason,
  updateSeason,
  deleteSeason,
  activateSeason,
  getSeasonStandings,
  getSeasonStats,
  seasonValidation
} = require('../controllers/seasonController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Rutas públicas
router.get('/', getAllSeasons);
router.get('/active', getActiveSeason);
router.get('/:id', getSeasonById);
router.get('/:id/standings', getSeasonStandings);
router.get('/:id/stats', getSeasonStats);

// Rutas protegidas
router.post('/', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  seasonValidation, 
  createSeason
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  seasonValidation, 
  updateSeason
);

router.put('/:id/activate', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  activateSeason
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  deleteSeason
);

module.exports = router;
