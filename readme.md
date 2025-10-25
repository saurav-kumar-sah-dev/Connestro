# 🚀 Connestro

> **Where connections grow stronger** — A modern, full-stack social media platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-connestro.vercel.app-blue?style=for-the-badge&logo=vercel)](https://connestro.vercel.app/)
[![GitHub Stars](https://img.shields.io/github/stars/saurav-kumar-sah-dev/Connestro?style=for-the-badge&logo=github)](https://github.com/saurav-kumar-sah-dev/Connestro)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-sauravkumarsah--dev-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/sauravkumarsah-dev/)

## 🌟 Overview

**Connestro** is a comprehensive social media platform that combines the best features of modern social networks with real-time communication, content sharing, and advanced moderation tools. Built with cutting-edge technologies, it offers a seamless experience across all devices.

### ✨ Key Highlights

- 🔐 **Multi-Auth**: Local + Google OAuth with secure password reset
- 📱 **Real-time**: Live messaging, video calls, and instant notifications  
- 🎬 **Content**: Posts, Reels, Stories, and Status updates
- 👥 **Social**: Follow system, live search, and enhanced profiles
- 🛡️ **Moderation**: Advanced admin dashboard with auto-moderation
- 🔄 **Multi-Account**: Switch between accounts without logout
- ☁️ **Cloudinary CDN**: Global media delivery with automatic optimization

---              

## 📋 Table of Contents

- [🌟 Overview](#-overview)
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [⚙️ Environment Variables](#️-environment-variables)
- [🔧 Development Scripts](#-development-scripts)
- [📦 Build & Deploy](#-build--deploy)
- [📁 File Uploads](#-file-uploads)
- [🔌 API Overview](#-api-overview)
- [⚡ Socket.IO Events](#-socketio-events)
- [📖 Stories Details](#-stories-details)
- [🎬 Reels Details](#-reels-details)
- [🔒 Security Notes](#-security-notes)
- [🐛 Troubleshooting](#-troubleshooting)
- [🛣️ Roadmap](#️-roadmap)
- [📸 Screenshots](#-screenshots)
- [📄 License](#-license)

---

## ✨ Features

### 🔐 Authentication & Security
- **Multi-Provider Auth**: Local signup/login + Google OAuth integration
- **Password Management**: Secure reset via email with Gmail SMTP
- **Account Security**: Terms acceptance and suspension enforcement
- **JWT Protection**: Bearer token authentication with expiration

### 👤 Enhanced Profiles
- **Basic Profile**: Name, username, bio, location, profile image/banner
- **Advanced Profile**: Skills, education, experience, websites, contact info
- **Privacy Controls**: Per-field visibility settings (public/private)
- **Account Management**: Username change tracking and history

### 📝 Content Creation
- **Rich Posts**: Text, images, videos, documents, and links
- **Engagement**: Likes, comments, reactions, and replies
- **Draft System**: Save content before publishing
- **Audience Control**: Public, followers-only, or private visibility

### 🎬 Reels (TikTok-style)
- **Vertical Videos**: 9:16 aspect ratio with autoplay and loop
- **Smart Navigation**: Swipe gestures and smooth transitions
- **Engagement**: Likes, comments, views, and share functionality
- **Validation**: Server-side duration and file size validation

### 📱 Stories & Status
- **24h Stories**: Auto-expiring content with viewer tracking
- **Status Updates**: Short text/emoji with optional expiry
- **Reactions**: Like, emoji reactions, and text replies
- **UI Integration**: Story rings across all interface elements

### 💬 Real-time Communication
- **Instant Messaging**: 1:1 chat with file attachments
- **Video/Audio Calls**: WebRTC-powered calling system
- **Presence**: Online/offline status indicators
- **Read Receipts**: Message delivery and read confirmations

### 🔔 Smart Notifications
- **Real-time Alerts**: Likes, comments, follows, messages, calls
- **Sound Controls**: Customizable notification sounds and volume
- **Badge Counts**: Unread message and notification counters
- **Settings**: Granular notification preferences

### 🛡️ Advanced Moderation
- **Report System**: User and content reporting with attachments
- **Auto-Moderation**: Automatic content hiding based on reports
- **Admin Dashboard**: Comprehensive management interface
- **Audit Trail**: Complete action logging with CSV exports

### 🔄 Multi-Account Management
- **Account Switching**: Seamless switching between accounts
- **State Management**: Automatic socket and chat state reinitialization
- **Account Storage**: Secure local storage of multiple accounts

---

## 🛠️ Tech Stack

### 🖥️ Backend
- **Runtime**: Node.js with Express.js framework
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO for live communication
- **Authentication**: JWT (JSON Web Tokens)
- **Media Storage**: Cloudinary CDN with automatic optimization
- **File Uploads**: Multer-Storage-Cloudinary for cloud handling
- **Email Service**: Nodemailer with Gmail SMTP
- **OAuth**: Google Auth Library for social login

### 🎨 Frontend
- **Framework**: React 19 with Vite build tool
- **Routing**: React Router for navigation
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context API
- **HTTP Client**: Axios for API communication
- **Real-time**: Socket.IO Client for live updates
- **Icons**: React Icons and Lucide React

### 🌐 Real-time Communication
- **WebSocket**: Socket.IO for instant messaging
- **WebRTC**: Peer-to-peer video/audio calls
- **Presence**: Online/offline user status
- **Notifications**: Real-time push notifications

### 🔒 Security & Performance
- **Authentication**: JWT with secure token handling
- **Rate Limiting**: Express rate limiting for API protection
- **CORS**: Cross-origin resource sharing configuration
- **File Validation**: Server-side file type and size validation
- **Input Sanitization**: XSS and injection attack prevention

---

## 🌐 Live Demo

<div align="center">

[![Live Demo](https://img.shields.io/badge/🚀%20Try%20Live%20Demo-connestro.vercel.app-00C7B7?style=for-the-badge&logo=vercel)](https://connestro.vercel.app/)

[![LinkedIn](https://img.shields.io/badge/👨‍💻%20Connect%20on%20LinkedIn-sauravkumarsah--dev-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/sauravkumarsah-dev/)

</div>

---

## 🚀 Quick Start

### 📋 Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Git

### 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/saurav-kumar-sah-dev/Connestro.git
   cd Connestro
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```
   > This also installs `ffprobe-static` for video verification

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up environment variables**
   - Create `server/.env` (see [Environment Variables](#️-environment-variables))
   - Create `client/.env` (see [Environment Variables](#️-environment-variables))

### 🚀 Development

1. **Start the server** (http://localhost:5000)
   ```bash
   cd server
   node server.js
   # or for development with auto-restart:
   nodemon server.js
   ```

2. **Start the client** (http://localhost:5173)
   ```bash
   cd client
   npm run dev
   ```

3. **Open your browser**
   Navigate to [http://localhost:5173](http://localhost:5173)

### 🎯 First Steps
1. Create an account or sign in with Google
2. Upload a profile picture and update your bio
3. Create your first post or reel
4. Explore the real-time messaging features
5. Try the video calling functionality

---

## ⚙️ Environment Variables

### 🖥️ Server Configuration (`server/.env`)

```env
# Server Configuration
PORT=5000
MONGO_URI=mongodb://localhost:27017/connestro
JWT_SECRET=your_jwt_secret

# CORS & Frontend
FRONTEND_URL=http://localhost:5173

# Cloudinary Configuration (Required for media storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email Configuration (optional - logs to console if missing)
GMAIL_USER=your.gmail@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
EMAIL_FROM=Connestro your.gmail@gmail.com
EMAIL_TLS_INSECURE=false # true only for local/dev if needed

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# Terms & Conditions
TERMS_VERSION=1.0

# Moderation Settings (optional)
REPORTS_THROTTLE_HOURS=24
REPORTS_AUTOMOD_COUNT=5
REPORTS_AUTOMOD_WINDOW_HOURS=6

# Call Settings
CALL_RING_TIMEOUT_MS=30000

# Content Limits
STORIES_DAILY_LIMIT=50
REELS_DAILY_LIMIT=30
REELS_MAX_DURATION_SEC=60
REELS_MAX_FILE_MB=200
```

### 🎨 Client Configuration (`client/.env`)

```env
# API Configuration
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

# WebRTC Configuration (optional)
VITE_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302

# TURN Server (if you have one)
VITE_TURN_URLS=turn:your.turn.server:3478
VITE_TURN_USERNAME=user
VITE_TURN_CREDENTIAL=pass

# UI Settings
VITE_CALL_RING_TIMEOUT_SEC=30
```

### 📝 Important Notes

- **Cloudinary Setup**: Required for all media storage - get free account at [cloudinary.com](https://cloudinary.com)
- **Gmail Setup**: Use an App Password (not your regular password)
- **Google OAuth**: Create OAuth Web Client ID and add `http://localhost:5173` to authorized origins
- **MongoDB**: Use local MongoDB or MongoDB Atlas for cloud database
- **JWT Secret**: Use a strong, random secret for production

---

## 🔧 Development Scripts

### 🖥️ Server Scripts
```bash
# Start server (development)
cd server
node server.js

# Start with auto-restart (recommended for development)
nodemon server.js

# Production (consider PM2/systemd)
pm2 start server.js --name connestro-server
```

### 🎨 Client Scripts
```bash
# Start development server
cd client
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 🚀 Production Considerations
- **Process Management**: Use PM2 or systemd for server process management
- **Load Balancing**: Consider Nginx for reverse proxy and load balancing
- **SSL**: Configure HTTPS for production deployment
- **Monitoring**: Set up logging and monitoring for production

---

## 📦 Build & Deploy

### 🎨 Frontend Deployment

1. **Build the client**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy to Vercel/Netlify**
   - The `dist/` folder contains the built files
   - Configure environment variables in your hosting platform
   - Set `VITE_API_URL` to your production server URL

### 🖥️ Backend Deployment

1. **Server Requirements**
   - Configure Cloudinary credentials for media storage
   - Configure CORS for production domains
   - Set up proper environment variables

2. **Reverse Proxy Setup**
   ```nginx
   # Nginx configuration example
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### 🌐 Production Environment Variables

Update your production environment variables:
- `FRONTEND_URL`: Your production frontend URL
- `MONGO_URI`: Production MongoDB connection string
- `JWT_SECRET`: Strong production secret
- `CLOUDINARY_*`: Your Cloudinary credentials for media storage
- `GMAIL_USER` & `GMAIL_APP_PASSWORD`: Production email credentials

---

## 📁 File Uploads

### ☁️ Cloudinary Integration

The application uses **Cloudinary** for all media storage, providing:

- **Global CDN**: Fast delivery worldwide with edge locations
- **Automatic Optimization**: Images and videos optimized automatically
- **Multiple Formats**: Auto-selection of best format (WebP, AVIF, etc.)
- **Transformations**: On-the-fly image/video processing
- **Scalability**: No server storage limitations

### 📏 File Size Limits

| Content Type | File Types | Max Size | Max Files | Special Notes |
|--------------|------------|----------|-----------|---------------|
| **Profile Images** | Images only | 5MB | 1 | Profile pictures and banners |
| **Posts** | Images, Videos, Documents | 50MB/file | 5 files | Rich media posts |
| **Chat Attachments** | Images, Videos, Documents | 25MB/file | 6 files | Message attachments |
| **Reports** | Images, PDFs | 5MB/file | Multiple | Report evidence |
| **Stories** | Images, Videos | 30MB/file | 1 | ≤ 15s video length |
| **Reels** | Videos only | 200MB/file | 1 | ≤ 60s, vertical preferred |

### 🔧 Technical Details

- **Cloud Storage**: All files stored in Cloudinary with organized folders
- **Validation**: Server-side file type and size validation
- **Video Processing**: ffprobe-static for metadata validation
- **Cleanup**: Automatic file deletion from Cloudinary on content deletion
- **Security**: File type restrictions and size limits
- **CDN Delivery**: Global edge locations for fast loading

### 🗑️ Automatic Cleanup

When users or content are deleted, the system automatically:
- Removes associated media files from Cloudinary
- Cleans up profile images and banners
- Removes story and reel media
- Updates follower/following references
- Maintains database integrity

### 🚀 Migration from Local Storage

If migrating from local file storage:

```bash
cd server
npm run migrate-cloudinary
```

See `server/CLOUDINARY_INTEGRATION.md` for detailed migration instructions.

### ☁️ Cloudinary Benefits

- **Global CDN**: 99.9% uptime with edge locations worldwide
- **Automatic Optimization**: Images converted to WebP/AVIF for faster loading
- **Smart Cropping**: AI-powered image transformations
- **Video Processing**: Automatic format optimization and compression
- **Unlimited Storage**: No file size or quantity restrictions
- **Real-time Transformations**: On-the-fly image/video processing
- **Security**: Built-in virus scanning and content moderation

---

## 🔌 API Overview

### Auth
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/forgot-password
- GET  /api/auth/reset-password/verify
- POST /api/auth/reset-password
- POST /api/auth/social/google

### Users
- GET  /api/users/search?query=
- GET  /api/users/username-available?username=
- GET  /api/users/:id
- PUT  /api/users/update
- PUT  /api/users/enhanced/update
- PUT  /api/users/:id/profile-image (multipart: profileImage)
- PUT  /api/users/:id/follow
- PUT  /api/users/:id/unfollow
- GET  /api/users/:id/followers
- GET  /api/users/:id/following
- PATCH /api/users/me/password
- DELETE /api/users/delete

### Posts
- POST   /api/posts (multipart “media”)
- GET    /api/posts
- GET    /api/posts/drafts
- GET    /api/posts/:id
- PUT    /api/posts/:id (multipart “media”)
- PUT    /api/posts/:id/edit
- PUT    /api/posts/:id/draft
- PUT    /api/posts/:id/publish
- PUT    /api/posts/like/:id
- POST   /api/posts/comment/:id
- PUT    /api/posts/:postId/comment/:commentId/react
- DELETE /api/posts/:id

### Status
- PUT    /api/users/me/status   # { text?, emoji?, expiresInMinutes?, visibility? }
- DELETE /api/users/me/status

### Stories
- POST   /api/stories                     # multipart media (image/video)
- GET    /api/stories                     # feed (me + following)
- GET    /api/stories/user/:userId        # active stories for user, honoring visibility
- GET    /api/stories/active?ids=...      # userId -> visible active count (for rings)
- POST   /api/stories/:id/view            # idempotent
- GET    /api/stories/:id/views           # owner only
- POST   /api/stories/:id/react           # { type: "like"|"emoji"|"text", emoji?, text? }
- GET    /api/stories/:id/reactions       # summary (likesCount, userLiked, latest)
- DELETE /api/stories/:id                 # owner only

### Reels (NEW)
- POST   /api/reels                       # multipart video (“reel”)
- GET    /api/reels                       # personalized feed (paginated/infinite scroll)
- GET    /api/reels/:id
- GET    /api/reels/user/:userId          # reels by user (public/profile tab)
- POST   /api/reels/:id/view              # idempotent view increment
- PUT    /api/reels/:id/like              # like/unlike
- POST   /api/reels/:id/comment           # { text }
- GET    /api/reels/:id/comments
- DELETE /api/reels/:id                   # owner only

### Reports
- POST /api/reports (multipart “attachments” images/PDF)
- GET  /api/reports/mine

### Messages
- GET    /api/messages/conversations
- POST   /api/messages/conversations/with/:userId
- GET    /api/messages/conversations/:id/messages
- POST   /api/messages/conversations/:id/messages (multipart “attachments”)
- PATCH  /api/messages/conversations/:id/read
- PATCH  /api/messages/message/:messageId
- DELETE /api/messages/message/:messageId
- DELETE /api/messages/message/:messageId/everyone
- POST   /api/messages/:id/clear

### Notifications
- GET    /api/notifications?limit=
- PATCH  /api/notifications/:id/read
- PATCH  /api/notifications/read-all
- DELETE /api/notifications/:id
- DELETE /api/notifications

### Admin
- GET  /api/admin/metrics
- GET  /api/admin/users
- PUT  /api/admin/users/:id/suspend
- PUT  /api/admin/users/:id/unsuspend
- DELETE /api/admin/users/:id
- GET  /api/admin/posts
- PUT  /api/admin/posts/:id/hide
- PUT  /api/admin/posts/:id/unhide
- DELETE /api/admin/posts/:id
- GET  /api/admin/reports
- GET  /api/admin/reports/:id
- PUT  /api/admin/reports/:id
- GET  /api/admin/reports/export
- GET  /api/admin/audit
- GET  /api/admin/audit/export

---

## ⚡ Socket.IO Events
- Auth: connect with auth: { token }
- Presence: presence:onlineUsers, presence:update
- Feed: newPost, updateLike, newComment, deletePost
- Profile: updateFollow, updateEnhancedProfile, updateProfileImage, userDeleted, usernameUpdated
- Notifications: notification:new
- Messages:
  - conversation:open/close
  - message:new, message:delivered, message:read, message:edited, message:deleted
  - conversation:updated, typing
- Calls:
  - call:invite, call:answer, call:signal, call:end
- Status: status:update
- Stories:
  - story:new, story:deleted, story:reaction (notify owner)
- Reels (NEW):
  - reel:new, reel:deleted, reel:like, reel:comment

---

## 📖 Stories Details
- Storage: /uploads/stories
- Expiry: 24 hours (MongoDB TTL on expiresAt)
- Video length: ≤ 15s, verified server‑side via ffprobe-static
- Visibility:
  - public: visible to everyone
  - followers: visible to owner and followers only
- Rings:
  - Profile avatar, Followers/Following list, Navbar search results, Chat list avatars
- Viewer:
  - Pause/Play, center tap toggle, double‑tap next, Esc/arrow keys
- Reactions:
  - Like toggle (counted), emoji quick reactions, text replies
- Notes:
  - TTL automatic deletion does not emit events; the client periodically purges expired stories.

---

## 🎬 Reels Details
- Storage: /uploads/reels
- Duration: ≤ 60s (configurable via REELS_MAX_DURATION_SEC)
- Aspect: Vertical 9:16 recommended (1080x1920)
- Player UX:
  - Autoplay, loop, mute/unmute, vertical swipe to next/prev
  - Double‑tap like, heart burst animation
  - Progress bar and pause on hold
  - Preload next/prev for smooth navigation
- Engagement:
  - Likes, comments, views (idempotent), share link
  - Per‑reel analytics (viewsCount, likesCount)
- Feed:
  - Personalized order (following-first, then recommended)
  - Infinite scroll with windowed rendering
- Validation:
  - Server ffprobe checks codec/duration; rejects > REELS_MAX_DURATION_SEC or > REELS_MAX_FILE_MB

---

## 🔒 Security Notes
- JWT secured endpoints; suspended accounts blocked at middleware and login
- Rate limiting on forgot password (per IP and per email)
- Username validation + reserved names
- Email normalization and validation
- Post/story/reel visibility gating per viewer
- Reports throttling per target/user
- Auto‑moderation hides posts when threshold reached in a window
- File-type checks for uploads; server deletes local files on relevant deletions
- Regex inputs safely escaped to prevent ReDoS/syntax errors
  - Use: `String(x).replace(/[.*+?^${}()|[```\```/g, '\\$&')`

---

## 🐛 Troubleshooting

### 📁 Media Upload Issues
- **Cloudinary upload fails**: 
  - Verify your Cloudinary credentials in `.env`
  - Check Cloudinary dashboard for usage limits
  - Ensure file size is within limits (see File Uploads section)
- **Images not loading**: 
  - Check Cloudinary URL format in database
  - Verify CORS settings for your domain
  - Check if Cloudinary account is active

### 🎬 Video Issues
- Video upload "Could not read metadata":
  - Client falls back gracefully; server ffprobe validates length/codec.
  - Prefer H.264 MP4/WebM; HEVC may not play on all browsers.
- Reels autoplay muted on mobile:
  - This is expected browser behavior. Unmute toggles sound.

### 🎨 UI Issues
- Close (X) not working in Story viewer:
  - Ensure latest layering/z-index in StoryViewer.jsx.
- Rings not showing for someone you follow:
  - Followers-only visibility requires you follow the owner.
  - Rings use /stories/active filtered by viewer visibility.

### 🔧 Technical Issues
- "s is not defined" or regex errors:
  - Use the safe escapeRegex pattern above.
- CORS:
  - Update allowedOrigins in server/server.js for your deployment domains.
- Gmail SMTP:
  - Must use an App Password; don't use your normal Gmail password.

---

## 🛣️ Roadmap
- Story highlights (pin to profile, no expiry)
- Swipe gestures for stories on mobile (left/right)
- Preload next/prev story media for smoother transitions
- Admin moderation for stories and reels
- Advanced Cloudinary transformations (AI cropping, auto-tagging)
- Per-user storage quotas
- Reels templates (trim/crop), background music mix, speed controls
- Trending reels with hashtags and sounds

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Contact

**Saurav Kumar Sah**
- LinkedIn: [sauravkumarsah-dev](https://www.linkedin.com/in/sauravkumarsah-dev/)
- GitHub: [saurav-kumar-sah-dev](https://github.com/saurav-kumar-sah-dev)
- Project Link: [https://github.com/saurav-kumar-sah-dev/Connestro](https://github.com/saurav-kumar-sah-dev/Connestro)

---

## 🙏 Acknowledgments

- React team for the amazing framework
- Socket.IO for real-time communication
- MongoDB for the flexible database
- Cloudinary for enterprise-grade media storage and CDN
- Vercel for hosting the frontend
- All the open-source contributors who made this possible

---

## 📸 Screenshots

### 🧩 Authentication
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1JUh8huCoMb_6wMHDX0xRQoSaWE2_qHmp" width="45%" alt="Signup Users" />
  <img src="https://drive.google.com/uc?export=view&id=1hv4WbsBjmHboqqIgqdTGOswSCjcNZPHd" width="45%" alt="Login Users" />
</p>
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1RXNYBEXrxp88bQ5v-ghgJ2gSpH0BgUyb" width="45%" alt="Terms and Conditions" />
  <img src="https://drive.google.com/uc?export=view&id=1uV_YGx5-DQcf-q1KQBLw5hUCrxyEOqpj" width="45%" alt="Forgot Password" />
</p>

---

### 👤 Profile
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1T6KlHdF4mrNKexmnA0B2h-VHd9rzw6wP" width="45%" alt="View Other Users Profile" />
  <img src="https://drive.google.com/uc?export=view&id=1wsLQHJWaD-M9bDecuVtSLMHFyS_ob5rr" width="45%" alt="My Profile" />
</p>
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1NFWA1h1YXFckrsOiDRQm6GlCK9wWltMw" width="45%" alt="Switch Account" />
  <img src="https://drive.google.com/uc?export=view&id=1LPP6U5kq_Agadzub8c5efss207hq6ojC" width="45%" alt="Search Users" />
</p>
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1Wlr4cCZj4LfTRajaTZhZzEzP30DmAhu9" width="45%" alt="Edit Profile" />
  <img src="https://drive.google.com/uc?export=view&id=1pvmvL7wN5p8s3BDutzLdhjEyP-o67jC8" width="45%" alt="Enhance Profile" />
</p>

---

### 🏠 Home Page
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1d43oAJPDLQZx2aXzyXbwRvydhOFyRLo4" width="45%" alt="Dark Theme" />
  <img src="https://drive.google.com/uc?export=view&id=15VxBRUFd2kh-0GPuM2hsq-g8CaWxe9SI" width="45%" alt="Light Theme" />
</p>

---

### 🛠️ Admin Dashboard
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1wdv1OxeqoLpS2wp-Hgxtk1V3IxaASVIq" width="45%" alt="Admin Overview" />
  <img src="https://drive.google.com/uc?export=view&id=1Zj2BOv9-O0vJrFbxTOt_fS12J1BFf-2K" width="45%" alt="Users Management" />
</p>
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1wq3E1l3KMJ8q4v-xe3AaGhkJT_EDFdq_" width="45%" alt="Posts Management" />
  <img src="https://drive.google.com/uc?export=view&id=1V-PtbKFDeUZisBKCQYe_45n60HJEd2uj" width="45%" alt="Reels Management" />
</p>
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1Q38R2Qm-Npvo3NaWKCzS7NL-uqzFrf-a" width="45%" alt="Report UI" />
  <img src="https://drive.google.com/uc?export=view&id=1rfHfLas3s70cUS_FBwu68mwiLEOL7UUT" width="45%" alt="Audit Logs" />
</p>

---

### 💬 Status
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1KKhPZnprTb3B-O6DQ6fOfjEM1ec2ig1B" width="60%" alt="Status UI" />
</p>

---

### 📰 Feed
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1TnnBP-LcUovi6u5LmKDotzZIRCdxtsyR" width="45%" alt="Feed UI" />
  <img src="https://drive.google.com/uc?export=view&id=1sHNsdIEyfYph_Cx5PpoyxtVoNakFtx0I" width="45%" alt="Post Creation" />
</p>

---

### 🎬 Reel
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1jSrsQb8_67PyNUvz2KhEU5WfznRChlpz" width="45%" alt="Reel UI" />
  <img src="https://drive.google.com/uc?export=view&id=1fFLAfuUTHnRFF4M0vZvoyakwelE832UG" width="45%" alt="Reel Creation" />
</p>

---

### 🔔 Notification
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1zlsRsmkIpTe2Or9XG5kB9Jezzs_nFZj0" width="60%" alt="Notification UI" />
</p>

---

### 💌 Message
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=145LtlQNKYAEbGwXoHwr4UZ_evo8j38em" width="60%" alt="Message UI" />
</p>

---

### 🧾 Reports
<p align="center">
  <img src="https://drive.google.com/uc?export=view&id=1WJdNhi4ZezGEfARbsu1oyeMMWmTzhKY3" width="60%" alt="Reports UI" />
</p>

