
const { query } = require('../config/database');

class Team {
  static async findById(id) {
    const result = await query(
      `SELECT e.*, u.username as responsable_username, u.nombre as responsable_nombre, u.apellido as responsable_apellido
       FROM equipos e
       LEFT JOIN usuarios u ON e.id_usuario_responsable = u.id_usuario
       WHERE e.id_equipo = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async getAll(page = 1, limit = 10, activeOnly = false) {
    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [limit, offset];

    if (activeOnly) {
      whereClause = 'WHERE e.activo = true';
    }

    const result = await query(
      `SELECT e.*, u.username as responsable_username, u.nombre as responsable_nombre, u.apellido as responsable_apellido,
              COUNT(j.id_jugador) as total_jugadores
       FROM equipos e
       LEFT JOIN usuarios u ON e.id_usuario_responsable = u.id_usuario
       LEFT JOIN jugadores j ON e.id_equipo = j.id_equipo AND j.activo = true
       ${whereClause}
       GROUP BY e.id_equipo, u.username, u.nombre, u.apellido
       ORDER BY e.nombre
       LIMIT $1 OFFSET $2`,
      params
    );

    const countQuery = activeOnly ? 
      'SELECT COUNT(*) FROM equipos WHERE activo = true' : 
      'SELECT COUNT(*) FROM equipos';
    
    const countResult = await query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    return {
      teams: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async create(teamData) {
    const {
      nombre, nombre_corto, logo_url, color_principal, color_secundario,
      fecha_fundacion, estadio, entrenador, id_usuario_responsable
    } = teamData;

    const result = await query(
      `INSERT INTO equipos (nombre, nombre_corto, logo_url, color_principal, color_secundario,
                           fecha_fundacion, estadio, entrenador, id_usuario_responsable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [nombre, nombre_corto, logo_url, color_principal, color_secundario,
       fecha_fundacion, estadio, entrenador, id_usuario_responsable]
    );
    return result.rows[0];
  }

  static async getPlayersCount(teamId) {
    const result = await query(
      'SELECT COUNT(*) FROM jugadores WHERE id_equipo = $1 AND activo = true',
      [teamId]
    );
    return parseInt(result.rows[0].count);
  }

  static async getTeamStats(teamId, seasonId) {
    const result = await query(
      `SELECT ee.*, tc.posicion
       FROM estadisticas_equipo ee
       LEFT JOIN tabla_clasificacion tc ON ee.id_equipo = tc.id_equipo AND ee.id_temporada = tc.id_temporada
       WHERE ee.id_equipo = $1 AND ee.id_temporada = $2`,
      [teamId, seasonId]
    );
    return result.rows[0];
  }

  static async searchByName(searchTerm, limit = 10) {
    const result = await query(
      `SELECT e.*, COUNT(j.id_jugador) as total_jugadores
       FROM equipos e
       LEFT JOIN jugadores j ON e.id_equipo = j.id_equipo AND j.activo = true
       WHERE e.activo = true AND (
         LOWER(e.nombre) LIKE LOWER($1) OR 
         LOWER(e.nombre_corto) LIKE LOWER($1)
       )
       GROUP BY e.id_equipo
       ORDER BY e.nombre
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );
    return result.rows;
  }
}

module.exports = Team;
