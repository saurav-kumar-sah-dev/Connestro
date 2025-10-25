#!/usr/bin/env node

/**
 * Migration script to help transition from local file storage to Cloudinary
 * This script provides utilities to:
 * 1. Upload existing local files to Cloudinary
 * 2. Update database records with Cloudinary URLs
 * 3. Clean up local files after successful migration
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Import models
const User = require('./models/User');
const Post = require('./models/Post');
const Story = require('./models/Story');
const { Reel } = require('./models/Reel'); // Named export
const Message = require('./models/Message');
const Report = require('./models/Report');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Helper function to upload a file to Cloudinary
async function uploadToCloudinary(filePath, folder) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `connestro/${folder}`,
      resource_type: 'auto',
      quality: 'auto'
      // Removed format: 'auto' as it's causing the error
    });
    return result;
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error.message);
    return null;
  }
}

// Helper function to update URLs in database
function updateUrlInObject(obj, oldUrl, newUrl) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  for (const key in obj) {
    if (obj[key] === oldUrl) {
      obj[key] = newUrl;
    } else if (typeof obj[key] === 'object') {
      updateUrlInObject(obj[key], oldUrl, newUrl);
    } else if (Array.isArray(obj[key])) {
      obj[key].forEach((item, index) => {
        if (typeof item === 'object') {
          updateUrlInObject(item, oldUrl, newUrl);
        } else if (item === oldUrl) {
          obj[key][index] = newUrl;
        }
      });
    }
  }
  return obj;
}

// Migration functions
async function migrateProfileImages() {
  console.log('🔄 Migrating profile images...');
  
  const users = await User.find({ 
    profileImage: { $regex: '^/uploads/profileImages/' } 
  });
  
  for (const user of users) {
    const oldUrl = user.profileImage;
    const filePath = path.join(UPLOADS_DIR, oldUrl.replace('/uploads/', ''));
    
    if (fs.existsSync(filePath)) {
      const result = await uploadToCloudinary(filePath, 'profile-images');
      if (result) {
        user.profileImage = result.secure_url;
        await user.save();
        console.log(`✅ Updated profile image for user ${user.username}`);
        
        // Delete local file
        fs.unlinkSync(filePath);
      }
    }
  }
}

async function migratePosts() {
  console.log('🔄 Migrating posts...');
  
  const posts = await Post.find({ 
    'media.url': { $regex: '^/uploads/posts/' } 
  });
  
  for (const post of posts) {
    let updated = false;
    
    for (const media of post.media) {
      if (media.url && media.url.startsWith('/uploads/posts/')) {
        const filePath = path.join(UPLOADS_DIR, media.url.replace('/uploads/', ''));
        
        if (fs.existsSync(filePath)) {
          const result = await uploadToCloudinary(filePath, 'posts');
          if (result) {
            media.url = result.secure_url;
            media.publicId = result.public_id;
            updated = true;
            console.log(`✅ Updated media in post ${post._id}`);
            
            // Delete local file
            fs.unlinkSync(filePath);
          }
        }
      }
    }
    
    if (updated) {
      await post.save();
    }
  }
}

async function migrateStories() {
  console.log('🔄 Migrating stories...');
  
  const stories = await Story.find({ 
    url: { $regex: '^/uploads/stories/' } 
  });
  
  for (const story of stories) {
    const oldUrl = story.url;
    const filePath = path.join(UPLOADS_DIR, oldUrl.replace('/uploads/', ''));
    
    if (fs.existsSync(filePath)) {
      const result = await uploadToCloudinary(filePath, 'stories');
      if (result) {
        story.url = result.secure_url;
        story.publicId = result.public_id;
        await story.save();
        console.log(`✅ Updated story ${story._id}`);
        
        // Delete local file
        fs.unlinkSync(filePath);
      }
    }
  }
}

async function migrateReels() {
  console.log('🔄 Migrating reels...');
  
  const reels = await Reel.find({ 
    url: { $regex: '^/uploads/reels/' } 
  });
  
  for (const reel of reels) {
    const oldUrl = reel.url;
    const filePath = path.join(UPLOADS_DIR, oldUrl.replace('/uploads/', ''));
    
    if (fs.existsSync(filePath)) {
      const result = await uploadToCloudinary(filePath, 'reels');
      if (result) {
        reel.url = result.secure_url;
        reel.publicId = result.public_id;
        await reel.save();
        console.log(`✅ Updated reel ${reel._id}`);
        
        // Delete local file
        fs.unlinkSync(filePath);
      }
    }
  }
}

async function migrateMessages() {
  console.log('🔄 Migrating message attachments...');
  
  const messages = await Message.find({ 
    'attachments.url': { $regex: '^/uploads/chat/' } 
  });
  
  for (const message of messages) {
    let updated = false;
    
    for (const attachment of message.attachments) {
      if (attachment.url && attachment.url.startsWith('/uploads/chat/')) {
        const filePath = path.join(UPLOADS_DIR, attachment.url.replace('/uploads/', ''));
        
        if (fs.existsSync(filePath)) {
          const result = await uploadToCloudinary(filePath, 'chat');
          if (result) {
            attachment.url = result.secure_url;
            attachment.publicId = result.public_id;
            updated = true;
            console.log(`✅ Updated attachment in message ${message._id}`);
            
            // Delete local file
            fs.unlinkSync(filePath);
          }
        }
      }
    }
    
    if (updated) {
      await message.save();
    }
  }
}

async function migrateReports() {
  console.log('🔄 Migrating report attachments...');
  
  const reports = await Report.find({ 
    'attachments.url': { $regex: '^/uploads/reports/' } 
  });
  
  for (const report of reports) {
    let updated = false;
    
    for (const attachment of report.attachments) {
      if (attachment.url && attachment.url.startsWith('/uploads/reports/')) {
        const filePath = path.join(UPLOADS_DIR, attachment.url.replace('/uploads/', ''));
        
        if (fs.existsSync(filePath)) {
          const result = await uploadToCloudinary(filePath, 'reports');
          if (result) {
            attachment.url = result.secure_url;
            attachment.publicId = result.public_id;
            updated = true;
            console.log(`✅ Updated attachment in report ${report._id}`);
            
            // Delete local file
            fs.unlinkSync(filePath);
          }
        }
      }
    }
    
    if (updated) {
      await report.save();
    }
  }
}

// Main migration function
async function runMigration() {
  try {
    console.log('🚀 Starting migration to Cloudinary...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Run migrations
    await migrateProfileImages();
    await migratePosts();
    await migrateStories();
    await migrateReels();
    await migrateMessages();
    await migrateReports();
    
    console.log('🎉 Migration completed successfully!');
    
    // Clean up empty directories
    const subdirs = ['profileImages', 'posts', 'stories', 'reels', 'chat', 'reports'];
    for (const subdir of subdirs) {
      const dirPath = path.join(UPLOADS_DIR, subdir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        if (files.length === 0) {
          fs.rmdirSync(dirPath);
          console.log(`🗑️  Removed empty directory: ${subdir}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
  migrateProfileImages,
  migratePosts,
  migrateStories,
  migrateReels,
  migrateMessages,
  migrateReports
};
