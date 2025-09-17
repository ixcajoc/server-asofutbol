
const { query } = require('../config/database');

// Reporte de tabla de clasificación
const getStandingsReport = async (req, res, next) => {
  try {
    const { seasonId } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    const result = await query(
      `SELECT tc.posicion, e.nombre as equipo, e.nombre_corto, e.logo_url,
              tc.puntos, tc.partidos_jugados, tc.partidos_ganados, 
              tc.partidos_empatados, tc.partidos_perdidos,
              tc.goles_favor, tc.goles_contra, tc.diferencia_goles,
              CASE 
                WHEN tc.partidos_jugados > 0 
                THEN ROUND((tc.puntos::DECIMAL / (tc.partidos_jugados * 3)) * 100, 2)
                ELSE 0.00
              END as efectividad
       FROM tabla_clasificacion tc
       JOIN equipos e ON tc.id_equipo = e.id_equipo
       WHERE tc.id_temporada = $1
       ORDER BY tc.posicion`,
      [seasonId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Reporte de goleadores
const getScorersReport = async (req, res, next) => {
  try {
    const { seasonId, limit = 20 } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    const result = await query(
      `SELECT j.nombre, j.apellido, j.numero_camiseta, j.posicion,
              e.nombre as equipo, e.nombre_corto as equipo_corto,
              ej.goles, ej.asistencias, ej.partidos_jugados,
              CASE 
                WHEN ej.partidos_jugados > 0 
                THEN ROUND(ej.goles::DECIMAL / ej.partidos_jugados, 2)
                ELSE 0.00
              END as promedio_goles
       FROM estadisticas_jugador ej
       JOIN jugadores j ON ej.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE ej.id_temporada = $1 AND ej.goles > 0
       ORDER BY ej.goles DESC, ej.asistencias DESC, ej.partidos_jugados ASC
       LIMIT $2`,
      [seasonId, limit]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Reporte de asistencias
const getAssistsReport = async (req, res, next) => {
  try {
    const { seasonId, limit = 20 } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    const result = await query(
      `SELECT j.nombre, j.apellido, j.numero_camiseta, j.posicion,
              e.nombre as equipo, e.nombre_corto as equipo_corto,
              ej.asistencias, ej.goles, ej.partidos_jugados,
              CASE 
                WHEN ej.partidos_jugados > 0 
                THEN ROUND(ej.asistencias::DECIMAL / ej.partidos_jugados, 2)
                ELSE 0.00
              END as promedio_asistencias
       FROM estadisticas_jugador ej
       JOIN jugadores j ON ej.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE ej.id_temporada = $1 AND ej.asistencias > 0
       ORDER BY ej.asistencias DESC, ej.goles DESC, ej.partidos_jugados ASC
       LIMIT $2`,
      [seasonId, limit]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Reporte de disciplina (tarjetas)
const getDisciplineReport = async (req, res, next) => {
  try {
    const { seasonId, limit = 20 } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    const result = await query(
      `SELECT j.nombre, j.apellido, j.numero_camiseta, j.posicion,
              e.nombre as equipo, e.nombre_corto as equipo_corto,
              ej.tarjetas_amarillas, ej.tarjetas_rojas, ej.partidos_jugados,
              (ej.tarjetas_amarillas + ej.tarjetas_rojas) as total_tarjetas
       FROM estadisticas_jugador ej
       JOIN jugadores j ON ej.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE ej.id_temporada = $1 AND (ej.tarjetas_amarillas > 0 OR ej.tarjetas_rojas > 0)
       ORDER BY ej.tarjetas_rojas DESC, ej.tarjetas_amarillas DESC
       LIMIT $2`,
      [seasonId, limit]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Reporte de estadísticas por equipo
const getTeamStatsReport = async (req, res, next) => {
  try {
    const { seasonId } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    const result = await query(
      `SELECT e.nombre as equipo, e.nombre_corto,
              ee.partidos_jugados, ee.partidos_ganados, ee.partidos_empatados, ee.partidos_perdidos,
              ee.goles_favor, ee.goles_contra, ee.diferencia_goles, ee.puntos,
              CASE 
                WHEN ee.partidos_jugados > 0 
                THEN ROUND((ee.partidos_ganados::DECIMAL / ee.partidos_jugados) * 100, 2)
                ELSE 0.00
              END as porcentaje_victorias,
              CASE 
                WHEN ee.partidos_jugados > 0 
                THEN ROUND(ee.goles_favor::DECIMAL / ee.partidos_jugados, 2)
                ELSE 0.00
              END as promedio_goles_favor,
              CASE 
                WHEN ee.partidos_jugados > 0 
                THEN ROUND(ee.goles_contra::DECIMAL / ee.partidos_jugados, 2)
                ELSE 0.00
              END as promedio_goles_contra
       FROM estadisticas_equipo ee
       JOIN equipos e ON ee.id_equipo = e.id_equipo
       WHERE ee.id_temporada = $1
       ORDER BY ee.puntos DESC, ee.diferencia_goles DESC`,
      [seasonId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Reporte de partidos por jornada
const getMatchdayReport = async (req, res, next) => {
  try {
    const { seasonId, matchday } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    let whereClause = 'WHERE t.id_temporada = $1';
    let params = [seasonId];

    if (matchday) {
      whereClause += ' AND j.numero_jornada = $2';
      params.push(matchday);
    }

    const result = await query(
      `SELECT j.numero_jornada, j.nombre as jornada_nombre,
              p.fecha_partido, p.estadio, p.estado,
              el.nombre as equipo_local, el.nombre_corto as local_corto,
              ev.nombre as equipo_visitante, ev.nombre_corto as visitante_corto,
              p.goles_local, p.goles_visitante,
              u.nombre as arbitro_nombre, u.apellido as arbitro_apellido
       FROM partidos p
       JOIN jornadas j ON p.id_jornada = j.id_jornada
       JOIN temporadas t ON j.id_temporada = t.id_temporada
       JOIN equipos el ON p.id_equipo_local = el.id_equipo
       JOIN equipos ev ON p.id_equipo_visitante = ev.id_equipo
       LEFT JOIN usuarios u ON p.id_arbitro = u.id_usuario
       ${whereClause}
       ORDER BY j.numero_jornada, p.fecha_partido`,
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

// Reporte general de la temporada
const getSeasonSummary = async (req, res, next) => {
  try {
    const { seasonId } = req.query;
    
    if (!seasonId) {
      return res.status(400).json({
        success: false,
        message: 'ID de temporada es requerido'
      });
    }

    // Estadísticas generales
    const generalStats = await query(
      `SELECT 
         COUNT(DISTINCT e.id_equipo) as total_equipos,
         COUNT(DISTINCT j.id_jugador) as total_jugadores,
         COUNT(DISTINCT p.id_partido) as total_partidos,
         COUNT(DISTINCT CASE WHEN p.estado = 'FINALIZADO' THEN p.id_partido END) as partidos_finalizados,
         COALESCE(SUM(p.goles_local + p.goles_visitante), 0) as total_goles,
         CASE 
           WHEN COUNT(DISTINCT CASE WHEN p.estado = 'FINALIZADO' THEN p.id_partido END) > 0
           THEN ROUND(SUM(p.goles_local + p.goles_visitante)::DECIMAL / COUNT(DISTINCT CASE WHEN p.estado = 'FINALIZADO' THEN p.id_partido END), 2)
           ELSE 0.00
         END as promedio_goles_partido
       FROM temporadas t
       LEFT JOIN jornadas jo ON t.id_temporada = jo.id_temporada
       LEFT JOIN partidos p ON jo.id_jornada = p.id_jornada
       LEFT JOIN estadisticas_equipo ee ON t.id_temporada = ee.id_temporada
       LEFT JOIN equipos e ON ee.id_equipo = e.id_equipo
       LEFT JOIN jugadores j ON e.id_equipo = j.id_equipo AND j.activo = true
       WHERE t.id_temporada = $1`,
      [seasonId]
    );

    // Máximo goleador
    const topScorer = await query(
      `SELECT j.nombre, j.apellido, e.nombre as equipo, ej.goles
       FROM estadisticas_jugador ej
       JOIN jugadores j ON ej.id_jugador = j.id_jugador
       JOIN equipos e ON j.id_equipo = e.id_equipo
       WHERE ej.id_temporada = $1
       ORDER BY ej.goles DESC, ej.asistencias DESC
       LIMIT 1`,
      [seasonId]
    );

    // Equipo líder
    const leader = await query(
      `SELECT e.nombre as equipo, tc.puntos, tc.partidos_jugados
       FROM tabla_clasificacion tc
       JOIN equipos e ON tc.id_equipo = e.id_equipo
       WHERE tc.id_temporada = $1
       ORDER BY tc.posicion
       LIMIT 1`,
      [seasonId]
    );

    res.json({
      success: true,
      data: {
        general: generalStats.rows[0],
        top_scorer: topScorer.rows[0] || null,
        leader: leader.rows[0] || null
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStandingsReport,
  getScorersReport,
  getAssistsReport,
  getDisciplineReport,
  getTeamStatsReport,
  getMatchdayReport,
  getSeasonSummary
};
