
const { query } = require('../config/database');

// Búsqueda general
const globalSearch = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    const searchTerm = q.trim();
    const searchPattern = `%${searchTerm}%`;

    // Buscar equipos
    const teamsResult = await query(
      `SELECT 'team' as type, id_equipo as id, nombre as title, nombre_corto as subtitle, logo_url as image
       FROM equipos 
       WHERE activo = true AND (
         LOWER(nombre) LIKE LOWER($1) OR 
         LOWER(nombre_corto) LIKE LOWER($1)
       )
       ORDER BY nombre
       LIMIT $2`,
      [searchPattern, Math.ceil(limit / 3)]
    );

    // Buscar jugadores
    const playersResult = await query(
      `SELECT 'player' as type, j.id_jugador as id, 
              CONCAT(j.nombre, ' ', j.apellido) as title, 
              CONCAT(e.nombre, ' - ', j.posicion) as subtitle,
              null as image
       FROM jugadores j
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE j.activo = true AND (
         LOWER(j.nombre) LIKE LOWER($1) OR 
         LOWER(j.apellido) LIKE LOWER($1) OR
         LOWER(CONCAT(j.nombre, ' ', j.apellido)) LIKE LOWER($1)
       )
       ORDER BY j.nombre, j.apellido
       LIMIT $2`,
      [searchPattern, Math.ceil(limit / 3)]
    );

    // Buscar usuarios (solo nombres públicos)
    const usersResult = await query(
      `SELECT 'user' as type, id_usuario as id,
              CONCAT(nombre, ' ', apellido) as title,
              r.nombre_rol as subtitle,
              null as image
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.activo = true AND (
         LOWER(u.nombre) LIKE LOWER($1) OR 
         LOWER(u.apellido) LIKE LOWER($1) OR
         LOWER(CONCAT(u.nombre, ' ', u.apellido)) LIKE LOWER($1)
       )
       ORDER BY u.nombre, u.apellido
       LIMIT $2`,
      [searchPattern, Math.ceil(limit / 3)]
    );

    const results = [
      ...teamsResult.rows,
      ...playersResult.rows,
      ...usersResult.rows
    ].slice(0, limit);

    res.json({
      success: true,
      data: results,
      total: results.length
    });
  } catch (error) {
    next(error);
  }
};

// Búsqueda de equipos
const searchTeams = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    const searchPattern = `%${q.trim()}%`;

    const result = await query(
      `SELECT e.*, COUNT(j.id_jugador) as total_jugadores
       FROM equipos e
       LEFT JOIN jugadores j ON e.id_equipo = j.id_equipo AND j.activo = true
       WHERE e.activo = true AND (
         LOWER(e.nombre) LIKE LOWER($1) OR 
         LOWER(e.nombre_corto) LIKE LOWER($1) OR
         LOWER(e.entrenador) LIKE LOWER($1)
       )
       GROUP BY e.id_equipo
       ORDER BY e.nombre
       LIMIT $2`,
      [searchPattern, limit]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Búsqueda de jugadores
const searchPlayers = async (req, res, next) => {
  try {
    const { q, team, position, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'El término de búsqueda debe tener al menos 2 caracteres'
      });
    }

    let whereConditions = [
      'j.activo = true',
      `(LOWER(j.nombre) LIKE LOWER($1) OR 
        LOWER(j.apellido) LIKE LOWER($1) OR
        LOWER(CONCAT(j.nombre, ' ', j.apellido)) LIKE LOWER($1))`
    ];
    
    let params = [`%${q.trim()}%`, limit];
    let paramIndex = 3;

    if (team) {
      whereConditions.push(`j.id_equipo = $${paramIndex}`);
      params.splice(-1, 0, team);
      paramIndex++;
    }

    if (position) {
      whereConditions.push(`j.posicion = $${paramIndex}`);
      params.splice(-1, 0, position);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const result = await query(
      `SELECT j.*, e.nombre as equipo_nombre, e.nombre_corto as equipo_nombre_corto
       FROM jugadores j
       JOIN equipos e ON j.id_equipo = e.id_equipo
       ${whereClause}
       ORDER BY j.nombre, j.apellido
       LIMIT $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Búsqueda de partidos
const searchMatches = async (req, res, next) => {
  try {
    const { team, date_from, date_to, status, season, limit = 10 } = req.query;
    
    let whereConditions = [];
    let params = [limit];
    let paramIndex = 2;

    if (team) {
      whereConditions.push(`(p.id_equipo_local = $${paramIndex} OR p.id_equipo_visitante = $${paramIndex})`);
      params.splice(-1, 0, team);
      paramIndex++;
    }

    if (date_from) {
      whereConditions.push(`p.fecha_partido >= $${paramIndex}`);
      params.splice(-1, 0, date_from);
      paramIndex++;
    }

    if (date_to) {
      whereConditions.push(`p.fecha_partido <= $${paramIndex}`);
      params.splice(-1, 0, date_to);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`p.estado = $${paramIndex}`);
      params.splice(-1, 0, status);
      paramIndex++;
    }

    if (season) {
      whereConditions.push(`t.id_temporada = $${paramIndex}`);
      params.splice(-1, 0, season);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT p.*, 
              j.numero_jornada,
              t.nombre as temporada_nombre,
              el.nombre as equipo_local_nombre, el.nombre_corto as equipo_local_corto,
              ev.nombre as equipo_visitante_nombre, ev.nombre_corto as equipo_visitante_corto
       FROM partidos p
       JOIN jornadas j ON p.id_jornada = j.id_jornada
       JOIN temporadas t ON j.id_temporada = t.id_temporada
       JOIN equipos el ON p.id_equipo_local = el.id_equipo
       JOIN equipos ev ON p.id_equipo_visitante = ev.id_equipo
       ${whereClause}
       ORDER BY p.fecha_partido DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  globalSearch,
  searchTeams,
  searchPlayers,
  searchMatches
};
