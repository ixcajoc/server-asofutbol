
const { query } = require('../config/database');

class User {
  static async findById(id) {
    const result = await query(
      `SELECT u.*, r.nombre_rol, r.permisos 
       FROM usuarios u 
       JOIN roles r ON u.id_rol = r.id_rol 
       WHERE u.id_usuario = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await query(
      'SELECT * FROM usuarios WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM usuarios WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async create(userData) {
    const {
      id_rol, username, email, password_hash, nombre, apellido, telefono, fecha_nacimiento
    } = userData;

    const result = await query(
      `INSERT INTO usuarios (id_rol, username, email, password_hash, nombre, apellido, telefono, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id_rol, username, email, password_hash, nombre, apellido, telefono, fecha_nacimiento]
    );
    return result.rows[0];
  }

  static async getAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT u.id_usuario, u.username, u.email, u.nombre, u.apellido, u.telefono, 
              u.activo, u.fecha_registro, u.ultimo_acceso, r.nombre_rol
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       ORDER BY u.fecha_registro DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM usuarios');
    const total = parseInt(countResult.rows[0].count);

    return {
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async updateLastAccess(id) {
    await query(
      'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id_usuario = $1',
      [id]
    );
  }
}

module.exports = User;
