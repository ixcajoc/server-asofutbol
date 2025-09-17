
const express = require('express');
const router = express.Router();
const {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  getUpcomingMatches,
  getMatchEvents,
  updateMatchResult,
  matchValidation
} = require('../controllers/matchController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Rutas públicas
router.get('/', getAllMatches);
router.get('/upcoming', getUpcomingMatches);
router.get('/:id', getMatchById);
router.get('/:id/events', getMatchEvents);

// Rutas protegidas
router.post('/', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  matchValidation, 
  createMatch
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR', 'ARBITRO']), 
  matchValidation, 
  updateMatch
);

router.put('/:id/result', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR', 'ARBITRO']), 
  updateMatchResult
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  deleteMatch
);

module.exports = router;
