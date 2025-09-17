
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de la base de datos
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: 'postgres', // Conectar a postgres para crear la DB
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

const dbName = process.env.DB_NAME || 'asofutbol_db';

async function installDatabase() {
  let client;
  
  try {
    console.log('🚀 Iniciando instalación de la base de datos ASOFÚTBOL...\n');
    
    // Conectar a PostgreSQL
    client = await pool.connect();
    console.log('✅ Conexión exitosa a PostgreSQL');
    
    // Verificar si la base de datos existe
    const dbCheckResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (dbCheckResult.rows.length === 0) {
      // Crear la base de datos
      console.log(`📦 Creando base de datos: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ Base de datos creada exitosamente');
    } else {
      console.log(`📦 Base de datos ${dbName} ya existe`);
    }
    
    client.release();
    
    // Conectar a la base de datos específica
    const dbPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: dbName,
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    });
    
    const dbClient = await dbPool.connect();
    console.log(`✅ Conectado a la base de datos: ${dbName}\n`);
    
    // Rutas de los archivos SQL
    const sqlFiles = [
      '/home/ubuntu/Uploads/asofutbol_database_schema.sql',
      '/home/ubuntu/Uploads/asofutbol_triggers_functions.sql',
      '/home/ubuntu/Uploads/asofutbol_indexes.sql'
    ];
    
    // Ejecutar cada archivo SQL
    for (const sqlFile of sqlFiles) {
      if (fs.existsSync(sqlFile)) {
        console.log(`📄 Ejecutando: ${path.basename(sqlFile)}`);
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');
        
        // Dividir el contenido en statements individuales
        const statements = sqlContent
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await dbClient.query(statement);
            } catch (error) {
              // Ignorar errores de elementos que ya existen
              if (!error.message.includes('already exists') && 
                  !error.message.includes('ya existe')) {
                console.warn(`⚠️  Advertencia en statement: ${error.message}`);
              }
            }
          }
        }
        
        console.log(`✅ ${path.basename(sqlFile)} ejecutado correctamente`);
      } else {
        console.log(`⚠️  Archivo no encontrado: ${sqlFile}`);
      }
    }
    
    // Verificar instalación
    console.log('\n🔍 Verificando instalación...');
    
    const tablesResult = await dbClient.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (
        'roles', 'usuarios', 'equipos', 'jugadores', 'temporadas', 
        'jornadas', 'partidos', 'eventos_partido', 'estadisticas_jugador', 
        'estadisticas_equipo', 'tabla_clasificacion'
      )
      ORDER BY tablename
    `);
    
    console.log(`📊 Tablas creadas: ${tablesResult.rows.length}/11`);
    tablesResult.rows.forEach(row => {
      console.log(`   ✓ ${row.tablename}`);
    });
    
    // Verificar roles por defecto
    const rolesResult = await dbClient.query('SELECT COUNT(*) FROM roles');
    console.log(`👥 Roles creados: ${rolesResult.rows[0].count}`);
    
    // Verificar funciones
    const functionsResult = await dbClient.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name LIKE 'fn_%'
    `);
    console.log(`⚙️  Funciones creadas: ${functionsResult.rows.length}`);
    
    // Verificar triggers
    const triggersResult = await dbClient.query(`
      SELECT COUNT(*) 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
    `);
    console.log(`🔧 Triggers creados: ${triggersResult.rows[0].count}`);
    
    dbClient.release();
    await dbPool.end();
    
    console.log('\n🎉 ¡Instalación completada exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Configurar las variables de entorno en .env');
    console.log('2. Ejecutar: npm run dev');
    console.log('3. La API estará disponible en http://localhost:3000');
    console.log('4. Documentación en http://localhost:3000/api/docs');
    
  } catch (error) {
    console.error('❌ Error durante la instalación:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Ejecutar instalación
if (require.main === module) {
  installDatabase();
}

module.exports = { installDatabase };
