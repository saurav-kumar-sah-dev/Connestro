# Cloudinary Integration Guide

This document explains how to migrate from local file storage to Cloudinary for all media files in the Connestro application.

## Overview

The application has been updated to use Cloudinary for all media storage instead of local file storage. This provides:

- **Better Performance**: CDN delivery with global edge locations
- **Automatic Optimization**: Images and videos are automatically optimized
- **Scalability**: No server storage limitations
- **Advanced Features**: Transformations, responsive images, etc.

## Setup

### 1. Environment Variables

Add these environment variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dtdm8uxru
CLOUDINARY_API_KEY=378587868579964
CLOUDINARY_API_SECRET=1ShlF6usdxpJZhDS1OJq4IvFJus
```

### 2. Install Dependencies

The required dependencies are already included in `package.json`:

```json
{
  "cloudinary": "^1.41.3",
  "multer-storage-cloudinary": "^4.0.0"
}
```

## File Structure

### Cloudinary Configuration

- **File**: `server/lib/cloudinary.js`
- **Purpose**: Centralized Cloudinary configuration and upload utilities

### Uploaders

Different uploaders are configured for different content types:

- **Profile Images**: `uploaders.profileImage` - Optimized for avatars (400x400)
- **Profile Banners**: `uploaders.profileBanner` - Optimized for headers (1200x400)
- **Posts**: `uploaders.posts` - General social media content
- **Stories**: `uploaders.stories` - Mobile-optimized (1080x1920)
- **Reels**: `uploaders.reels` - Vertical videos (1080x1920)
- **Chat**: `uploaders.chat` - Message attachments
- **Reports**: `uploaders.reports` - Report attachments

## Migration

### Automatic Migration

Run the migration script to move existing files to Cloudinary:

```bash
cd server
npm run migrate-cloudinary
```

This script will:
1. Upload all existing local files to Cloudinary
2. Update database records with Cloudinary URLs
3. Delete local files after successful upload
4. Clean up empty directories

### Manual Migration

If you prefer to migrate manually:

1. **Backup your database** before starting
2. **Upload files to Cloudinary** using the Cloudinary dashboard or API
3. **Update database records** with new Cloudinary URLs
4. **Test the application** to ensure everything works
5. **Delete local files** once confirmed working

## API Changes

### File Upload Response

Files now return Cloudinary URLs instead of local paths:

```javascript
// Before (local storage)
{
  url: "/uploads/posts/abc123.jpg",
  type: "image",
  name: "photo.jpg",
  size: 1024000,
  mime: "image/jpeg"
}

// After (Cloudinary)
{
  url: "https://res.cloudinary.com/dtdm8uxru/image/upload/v1234567890/connestro/posts/abc123.jpg",
  type: "image", 
  name: "photo.jpg",
  size: 1024000,
  mime: "image/jpeg",
  publicId: "connestro/posts/abc123"
}
```

### Database Schema Updates

Models now store `publicId` for Cloudinary files:

```javascript
// Post media example
{
  url: "https://res.cloudinary.com/...",
  type: "image",
  name: "photo.jpg",
  size: 1024000,
  mime: "image/jpeg",
  publicId: "connestro/posts/abc123"
}
```

## File Deletion

### Automatic Cleanup

When files are deleted, they are automatically removed from Cloudinary:

```javascript
// Delete media from Cloudinary
await cloudinaryUtils.deleteMedia(post.media || []);
```

### Manual Cleanup

You can manually delete files using the public ID:

```javascript
const { cloudinaryUtils } = require('./lib/cloudinary');

// Delete single file
await cloudinaryUtils.deleteFile('connestro/posts/abc123');

// Delete multiple files
await cloudinaryUtils.deleteFiles(['connestro/posts/abc123', 'connestro/posts/def456']);
```

## Image Transformations

### Automatic Optimizations

Cloudinary automatically applies optimizations:

- **Quality**: Auto-optimized based on content
- **Format**: Auto-selected best format (WebP, AVIF, etc.)
- **Progressive**: Progressive JPEG loading
- **Responsive**: Automatic responsive images

### Custom Transformations

You can apply custom transformations:

```javascript
const { cloudinaryUtils } = require('./lib/cloudinary');

// Get optimized URL with custom transformations
const optimizedUrl = cloudinaryUtils.getOptimizedUrl(originalUrl, {
  width: 800,
  height: 600,
  crop: 'fill',
  quality: 'auto',
  format: 'auto'
});
```

## Content Types

### Supported File Types

- **Images**: JPG, PNG, GIF, WebP
- **Videos**: MP4, WebM, MOV
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV

### File Size Limits

- **Profile Images**: 5MB
- **Profile Banners**: 10MB  
- **Posts**: 50MB
- **Stories**: 30MB
- **Reels**: 200MB
- **Chat**: 25MB
- **Reports**: 5MB

## Error Handling

### Upload Errors

The system handles various upload errors:

```javascript
// File too large
if (file.size > MAX_SIZE) {
  return res.status(400).json({ error: 'File too large' });
}

// Invalid file type
if (!ALLOWED_TYPES.includes(file.mimetype)) {
  return res.status(400).json({ error: 'Invalid file type' });
}
```

### Cloudinary Errors

Cloudinary errors are caught and handled gracefully:

```javascript
try {
  const result = await cloudinary.uploader.upload(filePath);
  return result.secure_url;
} catch (error) {
  console.error('Cloudinary upload error:', error);
  throw new Error('Failed to upload file');
}
```

## Performance Considerations

### CDN Benefits

- **Global Edge Locations**: Files served from nearest location
- **Automatic Caching**: Browser and CDN caching
- **Compression**: Automatic gzip compression
- **HTTP/2**: Modern protocol support

### Optimization Features

- **Lazy Loading**: Images load as needed
- **Responsive Images**: Different sizes for different devices
- **Format Selection**: Best format for each browser
- **Quality Optimization**: Balance between size and quality

## Security

### Access Control

- **Signed URLs**: Time-limited access for private content
- **Access Restrictions**: IP and referrer restrictions
- **Watermarking**: Automatic watermarking for sensitive content

### File Validation

- **MIME Type Checking**: Server-side validation
- **File Size Limits**: Prevent abuse
- **Virus Scanning**: Automatic malware detection

## Monitoring

### Cloudinary Dashboard

Monitor usage and performance:

- **Bandwidth Usage**: Track data transfer
- **Storage Usage**: Monitor storage consumption
- **Transformations**: Track image processing
- **Errors**: Monitor upload failures

### Application Logs

The application logs Cloudinary operations:

```javascript
console.log('Uploaded to Cloudinary:', result.secure_url);
console.error('Cloudinary error:', error.message);
```

## Troubleshooting

### Common Issues

1. **Upload Failures**: Check API credentials and file size limits
2. **Slow Uploads**: Check network connection and file size
3. **Missing Files**: Verify Cloudinary configuration
4. **Transform Errors**: Check transformation parameters

### Debug Mode

Enable debug logging:

```javascript
// In your .env file
CLOUDINARY_DEBUG=true
```

### Support

- **Cloudinary Documentation**: https://cloudinary.com/documentation
- **API Reference**: https://cloudinary.com/documentation/image_transformation_reference
- **Community Forum**: https://support.cloudinary.com/

## Rollback Plan

If you need to rollback to local storage:

1. **Stop the application**
2. **Restore database backup**
3. **Revert code changes**
4. **Restore local files**
5. **Restart application**

## Best Practices

### File Organization

- **Use folders**: Organize files by content type
- **Naming conventions**: Use descriptive names
- **Version control**: Keep track of file versions

### Performance

- **Optimize images**: Use appropriate dimensions
- **Compress videos**: Balance quality and size
- **Cache strategies**: Implement proper caching

### Security

- **Validate uploads**: Check file types and sizes
- **Sanitize filenames**: Remove special characters
- **Access controls**: Implement proper permissions

## Conclusion

The Cloudinary integration provides a robust, scalable solution for media storage and delivery. The migration process is straightforward, and the benefits include better performance, automatic optimizations, and global CDN delivery.

For any questions or issues, refer to the Cloudinary documentation or contact the development team.
