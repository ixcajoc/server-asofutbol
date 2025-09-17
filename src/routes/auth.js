
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  changePassword,
  registerValidation,
  loginValidation
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Rutas públicas
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Rutas protegidas
router.get('/profile', authenticateToken, getProfile);
router.put('/change-password', authenticateToken, changePassword);

module.exports = router;
