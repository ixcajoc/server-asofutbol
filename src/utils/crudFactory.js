
const { query } = require('../config/database');

// Factory para crear operaciones CRUD básicas
const createCrudController = (tableName, primaryKey = 'id') => {
  return {
    // Obtener todos los registros
    getAll: async (req, res, next) => {
      try {
        const { page = 1, limit = 10, orderBy = primaryKey, order = 'ASC' } = req.query;
        const offset = (page - 1) * limit;

        // Validar parámetros de ordenamiento
        const validOrders = ['ASC', 'DESC'];
        const finalOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

        const countResult = await query(`SELECT COUNT(*) FROM ${tableName}`);
        const total = parseInt(countResult.rows[0].count);

        const result = await query(
          `SELECT * FROM ${tableName} ORDER BY ${orderBy} ${finalOrder} LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

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
    },

    // Obtener un registro por ID
    getById: async (req, res, next) => {
      try {
        const { id } = req.params;
        const result = await query(`SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`, [id]);

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Registro no encontrado'
          });
        }

        res.json({
          success: true,
          data: result.rows[0]
        });
      } catch (error) {
        next(error);
      }
    },

    // Crear un nuevo registro
    create: async (req, res, next) => {
      try {
        const data = req.body;
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, index) => `$${index + 1}`);

        const result = await query(
          `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
          values
        );

        res.status(201).json({
          success: true,
          message: 'Registro creado exitosamente',
          data: result.rows[0]
        });
      } catch (error) {
        next(error);
      }
    },

    // Actualizar un registro
    update: async (req, res, next) => {
      try {
        const { id } = req.params;
        const data = req.body;
        
        // Remover campos que no deben actualizarse
        delete data[primaryKey];
        delete data.fecha_creacion;
        delete data.fecha_registro;

        const columns = Object.keys(data);
        const values = Object.values(data);
        
        if (columns.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No hay datos para actualizar'
          });
        }

        const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
        
        const result = await query(
          `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = $1 RETURNING *`,
          [id, ...values]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Registro no encontrado'
          });
        }

        res.json({
          success: true,
          message: 'Registro actualizado exitosamente',
          data: result.rows[0]
        });
      } catch (error) {
        next(error);
      }
    },

    // Eliminar un registro (soft delete si existe campo 'activo')
    delete: async (req, res, next) => {
      try {
        const { id } = req.params;

        // Verificar si la tabla tiene campo 'activo' para soft delete
        const tableInfo = await query(
          `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'activo'`,
          [tableName]
        );

        let result;
        if (tableInfo.rows.length > 0) {
          // Soft delete
          result = await query(
            `UPDATE ${tableName} SET activo = false WHERE ${primaryKey} = $1 RETURNING *`,
            [id]
          );
        } else {
          // Hard delete
          result = await query(
            `DELETE FROM ${tableName} WHERE ${primaryKey} = $1 RETURNING *`,
            [id]
          );
        }

        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Registro no encontrado'
          });
        }

        res.json({
          success: true,
          message: 'Registro eliminado exitosamente'
        });
      } catch (error) {
        next(error);
      }
    }
  };
};

module.exports = { createCrudController };
