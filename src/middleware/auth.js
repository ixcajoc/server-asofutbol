
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura';

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar que el usuario aún existe y está activo
    const result = await query(
      'SELECT id_usuario, username, email, id_rol, activo FROM usuarios WHERE id_usuario = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = result.rows[0];
    
    if (!user.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo'
      });
    }

    req.user = {
      id: user.id_usuario,
      username: user.username,
      email: user.email,
      roleId: user.id_rol
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token expirado'
      });
    }

    console.error('Error en autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Obtener información del rol del usuario
      const result = await query(
        'SELECT nombre_rol, permisos FROM roles WHERE id_rol = $1',
        [req.user.roleId]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Rol de usuario no válido'
        });
      }

      const userRole = result.rows[0];
      
      if (!allowedRoles.includes(userRole.nombre_rol)) {
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes para esta acción'
        });
      }

      req.user.role = userRole.nombre_rol;
      req.user.permissions = userRole.permisos;
      
      next();
    } catch (error) {
      console.error('Error verificando rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

// Middleware para verificar permisos específicos
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({
        success: false,
        message: 'Permisos no disponibles'
      });
    }

    if (!req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permiso '${permission}' requerido`
      });
    }

    next();
  };
};

// Generar token JWT
const generateToken = (userId, username, roleId) => {
  return jwt.sign(
    { 
      userId, 
      username, 
      roleId 
    },
    JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
    }
  );
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  generateToken,
  JWT_SECRET
};
