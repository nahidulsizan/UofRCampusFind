'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'application/pdf']);

function createUploader(relativeFolder) {
  const destination = path.join(uploadsRoot, relativeFolder);
  fs.mkdirSync(destination, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, destination),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    }
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      }
      return callback(null, true);
    }
  });
}

const uploadPrivatePhotoId = createUploader(path.join('private', 'photo-ids')).single('file');
const uploadLostItemPhoto = createUploader(path.join('private', 'lost-items')).single('file');

module.exports = { uploadPrivatePhotoId, uploadLostItemPhoto };
