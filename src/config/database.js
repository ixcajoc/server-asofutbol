
const { Pool } = require('pg');



const pool = new Pool({
  user: process.env.DB_USER || 'asofutbol_prueba_uno_user',
  host: process.env.DB_HOST || 'dpg-d2j9j67diees73buv290-a.oregon-postgres.render.com',
  database: process.env.DB_NAME || 'asofutbol_prueba_uno',
  password: process.env.DB_PASSWORD || 'DB_PASSWORD=slDeXLoj9BTOHYR1eEjZIT218uo9MCGM',
  port: process.env.DB_PORT || 5432,
  max: 20, // máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // tiempo de espera para obtener conexión
  ssl: {
    rejectUnauthorized: false, // para proveedores con certificados gestionados
  },
  
});

// const pool = new Pool('postgresql://asofutbol_prueba_uno_user:slDeXLoj9BTOHYR1eEjZIT218uo9MCGM@dpg-d2j9j67diees73buv290-a.oregon-postgres.render.com/asofutbol_prueba_uno?ssl=true');

// Manejo de errores del pool
pool.on('error', (err, client) => {
  console.error('Error inesperado en cliente de base de datos:', err);
  process.exit(-1);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params)
};
