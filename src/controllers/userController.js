
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { createCrudController } = require('../utils/crudFactory');

// Validaciones para usuarios
const userValidation = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),
  
  body('nombre')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El nombre debe tener máximo 100 caracteres')
    .trim(),
  
  body('apellido')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('El apellido debe tener máximo 100 caracteres')
    .trim(),
  
  // body('telefono')
  //   .optional()
  //   .isMobilePhone('es-CO')
  //   .withMessage('Debe proporcionar un número de teléfono válido'),
  
  body('fecha_nacimiento')
    .optional()
    .isISO8601()
    .withMessage('Debe proporcionar una fecha de nacimiento válida'),
  
  body('id_rol')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de rol debe ser válido')
];

// Usar CRUD básico como base
const baseCrud = createCrudController('usuarios', 'id_usuario');

// Obtener todos los usuarios con información de rol
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, active } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let params = [limit, offset];
    let paramIndex = 3;

    if (role) {
      whereConditions.push(`r.nombre_rol = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (active !== undefined) {
      whereConditions.push(`u.activo = $${paramIndex}`);
      params.push(active === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT u.id_usuario, u.username, u.email, u.nombre, u.apellido, u.telefono, 
              u.fecha_nacimiento, u.activo, u.fecha_registro, u.ultimo_acceso,
              r.nombre_rol, r.descripcion as rol_descripcion
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       ${whereClause}
       ORDER BY u.fecha_registro DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    // Contar total con las mismas condiciones
    const countParams = params.slice(2); // Remover limit y offset
    const countResult = await query(
      `SELECT COUNT(*) FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol ${whereClause}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtener usuario por ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.id_usuario, u.username, u.email, u.nombre, u.apellido, u.telefono, 
              u.fecha_nacimiento, u.activo, u.fecha_registro, u.ultimo_acceso,
              r.id_rol, r.nombre_rol, r.descripcion as rol_descripcion, r.permisos
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No devolver información sensible
    const user = result.rows[0];
    delete user.password_hash;

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Crear usuario (solo administradores)
const createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { username, email, password, nombre, apellido, telefono, fecha_nacimiento, id_rol } = req.body;

    if (!username || !email || !password || !nombre || !apellido) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, nombre y apellido son requeridos'
      });
    }

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

    // Usar rol por defecto si no se especifica
    const roleId = id_rol || 5; // COMUNIDAD por defecto

    const result = await query(
      `INSERT INTO usuarios (id_rol, username, email, password_hash, nombre, apellido, telefono, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_usuario, username, email, nombre, apellido`,
      [roleId, username, email, hashedPassword, nombre, apellido, telefono, fecha_nacimiento]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  }
};

// Actualizar usuario
const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Remover campos que no deben actualizarse directamente
    delete updateData.id_usuario;
    delete updateData.password;
    delete updateData.password_hash;
    delete updateData.fecha_registro;
    delete updateData.ultimo_acceso;

    // Solo administradores pueden cambiar roles
    if (updateData.id_rol && req.user.roleId !== 1) {
      delete updateData.id_rol;
    }

    // Solo el propio usuario o administrador puede actualizar
    // if (req.user.id !== parseInt(id) && req.user.role !== 'ADMINISTRADOR') {
    if (req.user.id !== parseInt(id) && req.user.roleId !== 1) {
      return res.status(403).json({
        success: false,
        message: `No tienes permisos para actualizar este usuario ${updateData}`
      });
    }

    const columns = Object.keys(updateData);
    const values = Object.values(updateData);
    
    if (columns.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay datos para actualizar'
      });
    }

    const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
    
    const result = await query(
      `UPDATE usuarios SET ${setClause} WHERE id_usuario = $1 RETURNING id_usuario, username, email, nombre, apellido, telefono, fecha_nacimiento, activo`,
      [id, ...values]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Cambiar rol de usuario (solo administradores)
const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id_rol } = req.body;

    if (!id_rol) {
      return res.status(400).json({
        success: false,
        message: 'ID de rol es requerido'
      });
    }

    // Verificar que el rol existe
    const roleResult = await query('SELECT nombre_rol FROM roles WHERE id_rol = $1', [id_rol]);
    
    if (roleResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rol no válido'
      });
    }

    const result = await query(
      'UPDATE usuarios SET id_rol = $1 WHERE id_usuario = $2 RETURNING id_usuario, username, email, nombre, apellido',
      [id_rol, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: `Rol actualizado a ${roleResult.rows[0].nombre_rol}`,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser: baseCrud.delete,
  changeUserRole,
  userValidation
};
