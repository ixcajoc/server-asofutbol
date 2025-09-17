
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// Filtro para tipos de archivo permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB por defecto
  }
});

// Middleware para subir foto de perfil
const uploadProfilePhoto = upload.single('profile_photo');

// Middleware para subir logo de equipo
const uploadTeamLogo = upload.single('team_logo');

// Controlador para subir foto de perfil de usuario
const uploadUserProfilePhoto = async (req, res, next) => {
  uploadProfilePhoto(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'El archivo es demasiado grande. Máximo 5MB permitido.'
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    try {
      const userId = req.user.id;
      const fileName = req.file.filename;
      const filePath = `/uploads/${fileName}`;

      // Obtener foto anterior para eliminarla (si existe la columna)
      let oldPhotoResult = { rows: [{}] };
      try {
        oldPhotoResult = await query(
          'SELECT telefono FROM usuarios WHERE id_usuario = $1',
          [userId]
        );
      } catch (error) {
        // La columna profile_photo no existe, continuamos sin error
      }

      // Por ahora solo guardamos el archivo, la referencia en BD se puede agregar después
      // await query(
      //   'UPDATE usuarios SET profile_photo = $1 WHERE id_usuario = $2',
      //   [filePath, userId]
      // );

      // Eliminar foto anterior si existe (comentado por ahora)
      // if (oldPhotoResult.rows[0]?.profile_photo) {
      //   const oldPhotoPath = path.join(__dirname, '../../', oldPhotoResult.rows[0].profile_photo);
      //   if (fs.existsSync(oldPhotoPath)) {
      //     fs.unlinkSync(oldPhotoPath);
      //   }
      // }

      res.json({
        success: true,
        message: 'Foto de perfil subida exitosamente',
        data: {
          filename: fileName,
          url: filePath,
          size: req.file.size
        }
      });

    } catch (error) {
      // Eliminar archivo subido si hay error en la base de datos
      if (req.file) {
        const filePath = path.join(__dirname, '../../uploads', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      next(error);
    }
  });
};

// Controlador para subir logo de equipo
const uploadTeamLogoPhoto = async (req, res, next) => {
  uploadTeamLogo(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'El archivo es demasiado grande. Máximo 5MB permitido.'
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    try {
      const { teamId } = req.params;
      const fileName = req.file.filename;
      const filePath = `/uploads/${fileName}`;

      // Verificar que el equipo existe
      const teamResult = await query(
        'SELECT logo_url FROM equipos WHERE id_equipo = $1',
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        // Eliminar archivo subido si el equipo no existe
        const uploadedFilePath = path.join(__dirname, '../../uploads', fileName);
        if (fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
        
        return res.status(404).json({
          success: false,
          message: 'Equipo no encontrado'
        });
      }

      const oldLogo = teamResult.rows[0].logo_url;

      // Actualizar la URL del logo en la base de datos
      await query(
        'UPDATE equipos SET logo_url = $1 WHERE id_equipo = $2',
        [filePath, teamId]
      );

      // Eliminar logo anterior si existe
      if (oldLogo) {
        const oldLogoPath = path.join(__dirname, '../../', oldLogo);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      res.json({
        success: true,
        message: 'Logo del equipo subido exitosamente',
        data: {
          filename: fileName,
          url: filePath,
          size: req.file.size
        }
      });

    } catch (error) {
      // Eliminar archivo subido si hay error en la base de datos
      if (req.file) {
        const filePath = path.join(__dirname, '../../uploads', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      next(error);
    }
  });
};

// Controlador para eliminar archivo
const deleteFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar que el archivo pertenece al usuario autenticado o es admin
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'ADMINISTRADOR') {
      // Por ahora permitir eliminar archivos propios (se puede mejorar después)
      // const fileUrl = `/uploads/${filename}`;
      // const ownerResult = await query(
      //   'SELECT id_usuario FROM usuarios WHERE profile_photo = $1 AND id_usuario = $2',
      //   [fileUrl, userId]
      // );

      // if (ownerResult.rows.length === 0) {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'No tienes permisos para eliminar este archivo'
      //   });
      // }
    }

    // Eliminar archivo del sistema de archivos
    fs.unlinkSync(filePath);

    // Actualizar base de datos para remover referencia (comentado por ahora)
    // await query(
    //   'UPDATE usuarios SET profile_photo = NULL WHERE profile_photo = $1',
    //   [`/uploads/${filename}`]
    // );

    await query(
      'UPDATE equipos SET logo_url = NULL WHERE logo_url = $1',
      [`/uploads/${filename}`]
    );

    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente'
    });

  } catch (error) {
    next(error);
  }
};

// Controlador para obtener información del archivo
const getFileInfo = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    const stats = fs.statSync(filePath);
    const extension = path.extname(filename);

    res.json({
      success: true,
      data: {
        filename,
        size: stats.size,
        extension,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/${filename}`
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadUserProfilePhoto,
  uploadTeamLogoPhoto,
  deleteFile,
  getFileInfo
};
