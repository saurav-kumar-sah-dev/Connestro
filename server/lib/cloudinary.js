const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// File type validation
const IMAGE_RE = /^image\/(png|jpe?g|webp|gif)$/i;
const VIDEO_RE = /^video\/(mp4|webm|quicktime|x-matroska)$/i;
const PDF_RE = /^application\/pdf$/i;
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

// File filter functions
const fileFilters = {
  images: (req, file, cb) =>
    IMAGE_RE.test(file.mimetype) ? cb(null, true) : cb(new Error('Invalid image type'), false),
  
  imagesVideos: (req, file, cb) =>
    (IMAGE_RE.test(file.mimetype) || VIDEO_RE.test(file.mimetype))
      ? cb(null, true)
      : cb(new Error('Only images and videos allowed'), false),
  
  reports: (req, file, cb) =>
    (IMAGE_RE.test(file.mimetype) || PDF_RE.test(file.mimetype))
      ? cb(null, true)
      : cb(new Error('Only images or PDF allowed'), false),
  
  posts: (req, file, cb) =>
    (IMAGE_RE.test(file.mimetype) || VIDEO_RE.test(file.mimetype) || DOC_RE.test(file.mimetype))
      ? cb(null, true)
      : cb(new Error('Only images, videos, or documents allowed'), false),
};

// Create Cloudinary storage configurations for different content types
const createStorage = (folder, transformation = {}) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `connestro/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
      transformation: transformation,
      resource_type: 'auto',
    },
  });
};

// Create uploaders for different content types
const createUploader = (folder, allow = 'images', fileSizeMB = 5, transformation = {}) => {
  const storage = createStorage(folder, transformation);
  
  return multer({
    storage: storage,
    fileFilter: fileFilters[allow] || fileFilters.images,
    limits: { 
      fileSize: fileSizeMB * 1024 * 1024,
      files: 10 // Maximum number of files
    },
  });
};

// Specific uploaders for different content types
const uploaders = {
  // Profile images - optimized for avatars
  profileImage: createUploader('profile-images', 'images', 5, {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto'
  }),

  // Profile banners - optimized for headers
  profileBanner: createUploader('profile-banners', 'images', 10, {
    width: 1200,
    height: 400,
    crop: 'fill',
    quality: 'auto'
  }),

  // Posts - optimized for social media
  posts: createUploader('posts', 'posts', 50, {
    quality: 'auto',
    flags: 'progressive'
  }),

  // Stories - optimized for mobile viewing
  stories: createUploader('stories', 'imagesVideos', 30, {
    width: 1080,
    height: 1920,
    crop: 'fill',
    quality: 'auto'
  }),

  // Reels - optimized for vertical videos
  reels: createUploader('reels', 'imagesVideos', 200, {
    width: 1080,
    height: 1920,
    crop: 'fill',
    quality: 'auto',
    video_codec: 'auto'
  }),

  // Chat attachments
  chat: createUploader('chat', 'posts', 25, {
    quality: 'auto'
  }),

  // Reports - documents and images
  reports: createUploader('reports', 'reports', 5, {
    quality: 'auto'
  }),
};

// Utility functions for Cloudinary operations
const cloudinaryUtils = {
  // Delete a single file from Cloudinary
  deleteFile: async (publicId) => {
    try {
      if (!publicId) return;
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      // Error deleting file from Cloudinary - silently fail
      throw error;
    }
  },

  // Delete multiple files from Cloudinary
  deleteFiles: async (publicIds) => {
    try {
      if (!publicIds || publicIds.length === 0) return;
      const result = await cloudinary.api.delete_resources(publicIds);
      return result;
    } catch (error) {
      // Error deleting files from Cloudinary - silently fail
      throw error;
    }
  },

  // Extract public ID from Cloudinary URL
  getPublicIdFromUrl: (url) => {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i);
    return match ? match[1] : null;
  },

  // Extract public IDs from media array
  getPublicIdsFromMedia: (media = []) => {
    const publicIds = [];
    for (const item of media) {
      if (item?.url) {
        const publicId = cloudinaryUtils.getPublicIdFromUrl(item.url);
        if (publicId) publicIds.push(publicId);
      }
    }
    return publicIds;
  },

  // Delete media array from Cloudinary
  deleteMedia: async (media = []) => {
    const publicIds = cloudinaryUtils.getPublicIdsFromMedia(media);
    if (publicIds.length > 0) {
      return await cloudinaryUtils.deleteFiles(publicIds);
    }
  },

  // Generate optimized URL for different use cases
  getOptimizedUrl: (url, options = {}) => {
    if (!url || typeof url !== 'string') return url;
    
    const {
      width,
      height,
      crop = 'fill',
      quality = 'auto',
      gravity = 'auto'
    } = options;

    // If it's already a Cloudinary URL, add transformations
    if (url.includes('cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        const transformations = [];
        if (width) transformations.push(`w_${width}`);
        if (height) transformations.push(`h_${height}`);
        if (crop) transformations.push(`c_${crop}`);
        if (quality) transformations.push(`q_${quality}`);
        if (gravity) transformations.push(`g_${gravity}`);
        
        if (transformations.length > 0) {
          return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
        }
      }
    }
    
    return url;
  }
};

module.exports = {
  cloudinary,
  uploaders,
  cloudinaryUtils,
  IMAGE_RE,
  VIDEO_RE,
  PDF_RE,
  DOC_RE
};
