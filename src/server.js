
const app = require('./app');
const { pool } = require('./config/database');

const PORT = process.env.PORT || 3000;

// Verificar conexión a la base de datos al iniciar
pool.connect()
  .then(client => {
    console.log('Conexión exitosa a PostgreSQL');
    client.release();
  })
  .catch(err => {
    console.error('Error conectando a PostgreSQL:', err.message);
    process.exit(1);
  });

const server = app.listen(PORT, () => {
  console.log(`Servidor ASOFÚTBOL API ejecutándose en puerto ${PORT}`);
  console.log(`Documentación disponible en http://localhost:${PORT}/api/docs`);
});

// Manejo graceful de cierre del servidor
process.on('SIGTERM', () => {
  console.log(' Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado correctamente');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log(' Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado correctamente');
    pool.end();
    process.exit(0);
  });
});
