const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Los archivos se guardan en /app/uploads dentro del contenedor,
// montado como volumen Docker para que persistan entre reinicios
// (ver ../../docker-compose.yml, servicio "backend").
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TIPOS_PERMITIDOS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = TIPOS_PERMITIDOS[file.mimetype] || path.extname(file.originalname) || '';
    const nombreUnico = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, nombreUnico);
  },
});

const fileFilter = (req, file, cb) => {
  if (!TIPOS_PERMITIDOS[file.mimetype]) {
    return cb(new Error('Solo se permiten archivos PDF, JPG, PNG o WEBP'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = { upload, UPLOAD_DIR };
