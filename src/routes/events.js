
const express = require('express');
const router = express.Router();
const {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsByMatch,
  getEventsByPlayer,
  eventValidation
} = require('../controllers/eventController');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');

// Rutas públicas
router.get('/', getAllEvents);
router.get('/match/:matchId', getEventsByMatch);
router.get('/player/:playerId', getEventsByPlayer);
router.get('/:id', getEventById);

// Rutas protegidas
router.post('/', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR', 'ARBITRO']), 
  eventValidation, 
  createEvent
);

router.put('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR', 'ARBITRO']), 
  eventValidation, 
  updateEvent
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  deleteEvent
);

module.exports = router;
