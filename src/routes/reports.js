
const express = require('express');
const router = express.Router();
const {
  getStandingsReport,
  getScorersReport,
  getAssistsReport,
  getDisciplineReport,
  getTeamStatsReport,
  getMatchdayReport,
  getSeasonSummary
} = require('../controllers/reportController');

// Todas las rutas de reportes son públicas para consulta
router.get('/standings', getStandingsReport);
router.get('/scorers', getScorersReport);
router.get('/assists', getAssistsReport);
router.get('/discipline', getDisciplineReport);
router.get('/team-stats', getTeamStatsReport);
router.get('/matchday', getMatchdayReport);
router.get('/season-summary', getSeasonSummary);

module.exports = router;
