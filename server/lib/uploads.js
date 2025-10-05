const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');

// Added 'stories' & 'reels' here
const SUBDIRS = ['profileImages', 'posts', 'chat', 'reports', 'stories', 'reels'];

function ensureUploadDirs() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  for (const d of SUBDIRS) fs.mkdirSync(path.join(UPLOADS_DIR, d), { recursive: true });
}

// FIXED regex
const IMAGE_RE = /^image\/(png|jpe?g|webp|gif)$/i;
const VIDEO_RE = /^video\/(mp4|webm|quicktime|x-matroska)$/i;
const PDF_RE = /^application\/pdf$/i;
// NEW: common document types (pdf, word, excel, powerpoint, text/csv)
const DOC_RE = new RegExp(
  [
    'application\\/pdf',
    'application\\/msword',
    'application\\/vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document',
    'application\\/vnd\\.ms-excel',
    'application\\/vnd\\.openxmlformats-officedocument\\.spreadsheetml\\.sheet',
    'application\\/vnd\\.ms-powerpoint',
    'application\\/vnd\\.openxmlformats-officedocument\\.presentationml\\.presentation',
    'text\\/plain',
    'text\\/csv',
  ].join('|'),
  'i'
);

function randomName(ext = '') {
  return crypto.randomBytes(12).toString('hex') + (ext ? ext.toLowerCase() : '');
}

function storageFor(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOADS_DIR, subdir)),
    filename: (req, file, cb) => cb(null, randomName(path.extname(file.originalname || '')))
  });
}

function makeUploader({ subdir, allow = 'images', fileSizeMB = 5 }) {
  let fileFilter;
  if (allow === 'images') {
    fileFilter = (req, file, cb) =>
      IMAGE_RE.test(file.mimetype) ? cb(null, true) : cb(new Error('Invalid image type'), false);
  } else if (allow === 'images+videos') {
    fileFilter = (req, file, cb) =>
      (IMAGE_RE.test(file.mimetype) || VIDEO_RE.test(file.mimetype))
        ? cb(null, true)
        : cb(new Error('Only images and videos allowed'), false);
  } else if (allow === 'reports') {
    fileFilter = (req, file, cb) =>
      (IMAGE_RE.test(file.mimetype) || PDF_RE.test(file.mimetype))
        ? cb(null, true)
        : cb(new Error('Only images or PDF allowed'), false);
  // NEW: posts allow images + videos + documents (pdf, doc, docx, xls, xlsx, ppt, pptx, csv, txt)
  } else if (allow === 'images+videos+docs' || allow === 'posts' || allow === 'documents') {
    fileFilter = (req, file, cb) =>
      (IMAGE_RE.test(file.mimetype) || VIDEO_RE.test(file.mimetype) || DOC_RE.test(file.mimetype))
        ? cb(null, true)
        : cb(new Error('Only images, videos, or documents (pdf, doc/x, xls/x, ppt/x, csv, txt) allowed'), false);
  } else {
    fileFilter = (req, file, cb) => cb(null, true);
  }

  return multer({
    storage: storageFor(subdir),
    fileFilter,
    limits: { fileSize: fileSizeMB * 1024 * 1024 },
  });
}

// FIXED replace for /uploads/ prefix
function fsPathForPublicUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  if (!publicUrl.startsWith('/uploads/')) return null;
  const rel = publicUrl.replace(/^\/uploads\//, '');
  return path.join(UPLOADS_DIR, rel);
}

async function unlinkMedia(media = []) {
  const tasks = [];
  for (const m of media) {
    if (!m?.url || typeof m.url !== 'string') continue;
    const p = fsPathForPublicUrl(m.url);
    if (!p) continue;
    tasks.push(fs.promises.unlink(p).catch(() => {}));
  }
  await Promise.allSettled(tasks);
}

async function unlinkFiles(urls = []) {
  const tasks = [];
  for (const u of urls) {
    const p = fsPathForPublicUrl(u);
    if (!p) continue;
    tasks.push(fs.promises.unlink(p).catch(() => {}));
  }
  await Promise.allSettled(tasks);
}

module.exports = {
  UPLOADS_DIR,
  ensureUploadDirs,
  makeUploader,
  IMAGE_RE,
  VIDEO_RE,
  PDF_RE,
  fsPathForPublicUrl,
  unlinkMedia,
  unlinkFiles,
};