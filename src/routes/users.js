
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  userValidation
} = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Rutas protegidas - requieren autenticación
router.get('/', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  getAllUsers
);

router.get('/:id', 
  authenticateToken, 
  getUserById
);

router.post('/', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  userValidation, 
  createUser
);

router.put('/:id', 
  authenticateToken, 
  userValidation, 
  updateUser
);

router.put('/:id/role', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  changeUserRole
);

router.delete('/:id', 
  authenticateToken, 
  requireRole(['ADMINISTRADOR']), 
  deleteUser
);

module.exports = router;
