
const express = require('express');
const router = express.Router();
const {
  globalSearch,
  searchTeams,
  searchPlayers,
  searchMatches
} = require('../controllers/searchController');

// Todas las rutas de búsqueda son públicas
router.get('/', globalSearch);
router.get('/teams', searchTeams);
router.get('/players', searchPlayers);
router.get('/matches', searchMatches);

module.exports = router;
