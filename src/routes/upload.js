
const express = require('express');
const router = express.Router();
const {
  uploadUserProfilePhoto,
  uploadTeamLogoPhoto,
  deleteFile,
  getFileInfo
} = require('../controllers/uploadController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todas las rutas de upload requieren autenticación
router.post('/profile-photo', authenticateToken, uploadUserProfilePhoto);
router.post('/team-logo/:teamId', authenticateToken, uploadTeamLogoPhoto);
router.delete('/file/:filename', authenticateToken, deleteFile);
router.get('/file/:filename/info', authenticateToken, getFileInfo);

module.exports = router;
