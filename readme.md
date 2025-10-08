# Connestro
Where connections grow stronger.

Connestro is a full‑stack social platform with real‑time features, private messaging and calls, rich profiles, moderation tools, multi‑account switching, Status, Stories, and Reels (short‑form vertical videos with views, likes, and comments). Built with Node.js, Express, MongoDB, Socket.IO, WebRTC, and React (Vite).

- Auth: Local + Google, password reset via email, terms acceptance, account suspension
- Feed: Posts (text + images/videos/links), likes, comments, comment reactions, drafts, audience controls
- Visual: Reels (short-form vertical video feed) + Stories (24h) + Status (short text/emoji)
- Messaging: 1:1 chat with attachments, read receipts, presence, audio/video calls
- Moderation: Reports, auto‑moderation, admin dashboard, audit exports
- Multi‑account: Add/switch/remove accounts without logging out

---

## Table of Contents
- Features
- Tech Stack
- Monorepo Layout
- Quick Start
- Environment Variables (Server + Client)
- Development Scripts
- Build & Deploy
- File Uploads
- API Overview (selected)
- Socket.IO Events
- Stories Details
- Reels Details
- Security Notes
- Troubleshooting
- Roadmap
- License
- Screenshots (optional)

---

## Features

### Authentication
- Local signup/login, Google Sign‑In (GIS)
- Forgot/reset password via email (Gmail SMTP or console fallback)
- Terms acceptance and account suspension enforcement

### Profiles
- Basic: name, username, bio, location, profile image/banner
- Enhanced: skills, education, experience, websites, contact info, linked accounts, achievements
- Per‑field visibility (public/private)
- Username change tracking

### Posts
- Text + images/videos/links
- Likes, comments, comment reactions
- Drafts and audience: public / followers / private
- Per‑viewer feed rendering

### Reels
- Vertical short‑form videos (9:16), autoplay, loop, mute/unmute
- Likes and comments, viewer count
- Smart preloading; swipe up/down navigation
- Server‑side duration validation via ffprobe

### Status
- Short text + emoji with optional expiry and privacy (public/private)
- Realtime updates to viewers

### Stories
- Image or video (≤ 15s), auto‑expires after 24 hours (MongoDB TTL)
- Viewer tracking, reactions (like/emoji/text)
- Rings across UI (StoryBar, profile, lists, search, chat)

### Following
- Follow/unfollow + realtime updates

### Search
- Live user search (name/username/place) with safe regex escaping

### Messaging + Calls
- Conversations, text messages with attachments
- Delivery/read receipts, edit/delete, clear‑for‑me
- Presence indicators
- Audio/video calls (WebRTC), ring timeout

### Notifications
- Likes, comments, follows, messages, calls, comment reactions, moderation/report updates
- Badge count and optional sounds

### Moderation
- Reports (post/user) with images/PDF
- Auto‑moderation: hide posts after N reports in a time window
- Admin dashboard: users, posts, reports, metrics, audit trail (CSV exports)
- Admin actions (suspend/unsuspend/hide/unhide/delete)

### Multi‑account (client)
- Add/switch/remove accounts without logging out
- Socket/chat state auto‑reinit on switch

---

## Tech Stack
- Backend: Node.js, Express, Mongoose (MongoDB), Socket.IO, Multer, Nodemailer, ffprobe-static, Google Auth Library
- Frontend: React (Vite), Socket.IO Client
- Realtime: Socket.IO + WebRTC (calls)
- Auth: JWT (Bearer tokens)
- Email: Gmail SMTP (App Password) or console fallback

---

## 🌐 Connect & Try  

🔗 [**View Deployed App**](https://connestro.vercel.app/) ✅ *(Live Now)*  
🔗 [**Linkedin Profile**](https://www.linkedin.com/in/sauravkumarsah-dev/) ✅ *(Linkedin)*  

---

## Quick Start

Install dependencies

Server
cd server
npm install

also installs ffprobe-static for video verification
text


Client
cd client
npm install

text


Create environment files
- server/.env (see “Environment Variables”)
- client/.env (see “Environment Variables”)

Start dev

Server (http://localhost:5000)
cd server
node server.js

or nodemon server.js
text


Client (http://localhost:5173)
cd client
npm run dev

text


Open http://localhost:5173

---

## Environment Variables

Create server/.env:
Server
PORT=5000
MONGO_URI=mongodb://localhost:27017/connestro
JWT_SECRET=your_jwt_secret

CORS + Frontend
FRONTEND_URL=http://localhost:5173

Uploads
UPLOADS_DIR=./uploads

Email (optional; if missing, emails log to console)
GMAIL_USER=your.gmail@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
EMAIL_FROM=Connestro your.gmail@gmail.com
EMAIL_TLS_INSECURE=false # true only for local/dev if needed

Google Sign-In
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

Terms versioning (optional)
TERMS_VERSION=1.0

Reports / Auto‑mod (optional)
REPORTS_THROTTLE_HOURS=24
REPORTS_AUTOMOD_COUNT=5
REPORTS_AUTOMOD_WINDOW_HOURS=6

Calls
CALL_RING_TIMEOUT_MS=30000

Stories
STORIES_DAILY_LIMIT=50

Reels (NEW)
REELS_DAILY_LIMIT=30
REELS_MAX_DURATION_SEC=60
REELS_MAX_FILE_MB=200

text


Create client/.env:
Client (Vite)
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com

WebRTC STUN/TURN (optional)
VITE_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302

If you have TURN:
VITE_TURN_URLS=turn:your.turn.server:3478
VITE_TURN_USERNAME=user
VITE_TURN_CREDENTIAL=pass
Calls UI
VITE_CALL_RING_TIMEOUT_SEC=30

text


Notes:
- Gmail: Use an App Password (not your normal password).
- Google Sign‑In: Create an OAuth Web Client ID; add http://localhost:5173 under Authorized JS origins (dev).

---

## Development Scripts
- server: node server.js (or nodemon server.js)
- client: npm run dev

Optional:
- For production, consider PM2/systemd for the server.

---

## Build & Deploy

Client:
cd client
npm run build

serves from dist/ via Netlify/Vercel/static server
text


Server:
- Keep Express serving /uploads
- Expose server URL to client via VITE_API_URL
- Configure CORS allowed origins to your production domain(s)

Reverse proxy:
- Nginx/Apache/Caddy in front of Node + static client files

---

## File Uploads
- Static: /uploads (served by Express with caching)
- Subdirs: profileImages, posts, chat, reports, stories, reels

Limits:
- Profile image: images only, ≤ 5MB
- Posts: images+videos, ≤ 50MB/file, up to 5 files
- Chat: images+videos, ≤ 25MB/file, up to 6 files
- Reports: images+PDF, ≤ 5MB/file
- Stories: images+videos, ≤ 30MB/file, video length ≤ 15s (ffprobe‑validated)
- Reels: videos only (vertical preferred), ≤ 200MB/file, video length ≤ 60s (ffprobe‑validated)

Cleanup:
- User deletion cascades: posts + media, stories + media, reels + media, followers/following references, profile image/banner

---

## API Overview (selected)

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

## Socket.IO Events (summary)
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

## Stories Details
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

## Reels Details
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

## Security Notes
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

## Troubleshooting
- Video upload “Could not read metadata”:
  - Client falls back gracefully; server ffprobe validates length/codec.
  - Prefer H.264 MP4/WebM; HEVC may not play on all browsers.
- Reels autoplay muted on mobile:
  - This is expected browser behavior. Unmute toggles sound.
- Close (X) not working in Story viewer:
  - Ensure latest layering/z-index in StoryViewer.jsx.
- Rings not showing for someone you follow:
  - Followers-only visibility requires you follow the owner.
  - Rings use /stories/active filtered by viewer visibility.
- “s is not defined” or regex errors:
  - Use the safe escapeRegex pattern above.
- CORS:
  - Update allowedOrigins in server/server.js for your deployment domains.
- Gmail SMTP:
  - Must use an App Password; don’t use your normal Gmail password.

---

## Roadmap
- Story highlights (pin to profile, no expiry)
- Swipe gestures for stories on mobile (left/right)
- Preload next/prev story media for smoother transitions
- Admin moderation for stories and reels
- CDN integration for /uploads
- Per-user storage quotas
- Reels templates (trim/crop), background music mix, speed controls
- Trending reels with hashtags and sounds

---

## License
Add your license of choice (e.g., MIT).

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

### 🎬 Reels
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
