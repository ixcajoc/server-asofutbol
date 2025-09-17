
// Middleware para manejar rutas no encontradas
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Middleware para manejo centralizado de errores
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Error de validación de PostgreSQL
  if (err.code === '23505') {
    statusCode = 400;
    message = 'Ya existe un registro con esos datos únicos';
  }

  // Error de clave foránea de PostgreSQL
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referencia a registro inexistente';
  }

  // Error de violación de restricción
  if (err.code === '23514') {
    statusCode = 400;
    message = 'Los datos no cumplen con las restricciones requeridas';
  }

  // Error de conexión a base de datos
  if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Servicio de base de datos no disponible';
  }

  // Error de token JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // Log del error en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Stack:', err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  notFound,
  errorHandler
};
