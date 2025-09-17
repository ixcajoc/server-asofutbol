
const { query } = require('../config/database');

class Player {
  static async findById(id) {
    const result = await query(
      `SELECT j.*, e.nombre as equipo_nombre, e.nombre_corto as equipo_nombre_corto
       FROM jugadores j
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE j.id_jugador = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async getAll(page = 1, limit = 10, teamId = null, position = null) {
    const offset = (page - 1) * limit;
    let whereConditions = ['j.activo = true'];
    let params = [limit, offset];
    let paramIndex = 3;

    if (teamId) {
      whereConditions.push(`j.id_equipo = $${paramIndex}`);
      params.push(teamId);
      paramIndex++;
    }

    if (position) {
      whereConditions.push(`j.posicion = $${paramIndex}`);
      params.push(position);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT j.*, e.nombre as equipo_nombre, e.nombre_corto as equipo_nombre_corto
       FROM jugadores j
       JOIN equipos e ON j.id_equipo = e.id_equipo
       ${whereClause}
       ORDER BY e.nombre, j.numero_camiseta
       LIMIT $1 OFFSET $2`,
      params
    );

    // Contar total con las mismas condiciones
    const countParams = params.slice(2); // Remover limit y offset
    const countResult = await query(
      `SELECT COUNT(*) FROM jugadores j JOIN equipos e ON j.id_equipo = e.id_equipo ${whereClause}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].count);

    return {
      players: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getByTeam(teamId) {
    const result = await query(
      `SELECT j.*, e.nombre as equipo_nombre
       FROM jugadores j
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE j.id_equipo = $1 AND j.activo = true
       ORDER BY j.numero_camiseta`,
      [teamId]
    );
    return result.rows;
  }

  static async create(playerData) {
    const {
      id_equipo, numero_camiseta, nombre, apellido, fecha_nacimiento, posicion,
      peso, altura, pie_habil, nacionalidad, documento_identidad, telefono, email
    } = playerData;

    const result = await query(
      `INSERT INTO jugadores (id_equipo, numero_camiseta, nombre, apellido, fecha_nacimiento, 
                             posicion, peso, altura, pie_habil, nacionalidad, documento_identidad, telefono, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [id_equipo, numero_camiseta, nombre, apellido, fecha_nacimiento, posicion,
       peso, altura, pie_habil, nacionalidad, documento_identidad, telefono, email]
    );
    return result.rows[0];
  }

  static async getPlayerStats(playerId, seasonId) {
    const result = await query(
      `SELECT ej.*, j.nombre, j.apellido, j.posicion, e.nombre as equipo_nombre
       FROM estadisticas_jugador ej
       JOIN jugadores j ON ej.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE ej.id_jugador = $1 AND ej.id_temporada = $2`,
      [playerId, seasonId]
    );
    return result.rows[0];
  }

  static async getTopScorers(seasonId, limit = 10) {
    const result = await query(
      `SELECT ej.*, j.nombre, j.apellido, j.posicion, e.nombre as equipo_nombre, e.nombre_corto
       FROM estadisticas_jugador ej
       JOIN jugadores j ON ej.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE ej.id_temporada = $1 AND ej.goles > 0
       ORDER BY ej.goles DESC, ej.asistencias DESC, ej.partidos_jugados ASC
       LIMIT $2`,
      [seasonId, limit]
    );
    return result.rows;
  }

  static async searchByName(searchTerm, limit = 10) {
    const result = await query(
      `SELECT j.*, e.nombre as equipo_nombre, e.nombre_corto as equipo_nombre_corto
       FROM jugadores j
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE j.activo = true AND (
         LOWER(j.nombre) LIKE LOWER($1) OR 
         LOWER(j.apellido) LIKE LOWER($1) OR
         LOWER(CONCAT(j.nombre, ' ', j.apellido)) LIKE LOWER($1)
       )
       ORDER BY j.nombre, j.apellido
       LIMIT $2`,
      [`%${searchTerm}%`, limit]
    );
    return result.rows;
  }

  static async checkJerseyNumber(teamId, jerseyNumber, excludePlayerId = null) {
    let queryText = 'SELECT id_jugador FROM jugadores WHERE id_equipo = $1 AND numero_camiseta = $2 AND activo = true';
    let params = [teamId, jerseyNumber];

    if (excludePlayerId) {
      queryText += ' AND id_jugador != $3';
      params.push(excludePlayerId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  }
}

module.exports = Player;
