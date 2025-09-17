
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { generateToken } = require('../middleware/auth');

// Validaciones para registro
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
  
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 3 })
    .withMessage('La contraseña debe tener al menos 3 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  
  body('nombre')
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre es requerido y debe tener máximo 100 caracteres')
    .trim(),
  
  body('apellido')
    .isLength({ min: 1, max: 100 })
    .withMessage('El apellido es requerido y debe tener máximo 100 caracteres')
    .trim(),
  
  // body('telefono')
  //   .optional()
  //   .isMobilePhone('es-GT')
  //   .withMessage('Debe proporcionar un número de teléfono válido'),
  
  body('fecha_nacimiento')
    .optional()
    .isISO8601()
    .withMessage('Debe proporcionar una fecha de nacimiento válida')
];

// Validaciones para login
const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('El nombre de usuario es requerido'),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

// Registro de usuario
const register = async (req, res, next) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { username, email, password, nombre, apellido, telefono, fecha_nacimiento } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await query(
      'SELECT id_usuario FROM usuarios WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario o email ya están registrados'
      });
    }

    // Encriptar contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Obtener rol por defecto (COMUNIDAD)
    const roleResult = await query(
      'SELECT id_rol FROM roles WHERE nombre_rol = $1',
      ['COMUNIDAD']
    );

    if (roleResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Error de configuración: rol por defecto no encontrado'
      });
    }

    const defaultRoleId = roleResult.rows[0].id_rol;

    // Crear usuario
    const result = await query(
      `INSERT INTO usuarios (id_rol, username, email, password_hash, nombre, apellido, telefono, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_usuario, username, email, nombre, apellido`,
      [defaultRoleId, username, email, hashedPassword, nombre, apellido, telefono, fecha_nacimiento]
    );

    const newUser = result.rows[0];

    // Generar token
    const token = generateToken(newUser.id_usuario, newUser.username, defaultRoleId);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: newUser.id_usuario,
          username: newUser.username,
          email: newUser.email,
          nombre: newUser.nombre,
          apellido: newUser.apellido
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

// Login de usuario
const login = async (req, res, next) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // Buscar usuario
    const result = await query(
      `SELECT u.id_usuario, u.username, u.email, u.password_hash, u.nombre, u.apellido, 
              u.id_rol, u.activo, r.nombre_rol, r.permisos
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.username = $1 OR u.email = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = result.rows[0];

    // Verificar si el usuario está activo
    if (!user.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo. Contacte al administrador.'
      });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar último acceso
    await query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = $1',
      [user.id_usuario]
    );

    // Generar token
    const token = generateToken(user.id_usuario, user.username, user.id_rol);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id_usuario,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          role: user.nombre_rol,
          permissions: user.permisos
        },
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

// Obtener perfil del usuario autenticado
const getProfile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id_usuario, u.username, u.email, u.nombre, u.apellido, u.telefono, 
              u.fecha_nacimiento, u.fecha_registro, u.ultimo_acceso, r.nombre_rol, r.permisos
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id_usuario,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        telefono: user.telefono,
        fecha_nacimiento: user.fecha_nacimiento,
        fecha_registro: user.fecha_registro,
        ultimo_acceso: user.ultimo_acceso,
        role: user.nombre_rol,
        permissions: user.permisos
      }
    });

  } catch (error) {
    next(error);
  }
};

// Cambiar contraseña
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener contraseña actual del usuario
    const result = await query(
      'SELECT password_hash FROM usuarios WHERE id_usuario = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = result.rows[0];

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await query(
      'UPDATE usuarios SET password_hash = $1 WHERE id_usuario = $2',
      [hashedNewPassword, req.user.id]
    );

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword,
  registerValidation,
  loginValidation
};
