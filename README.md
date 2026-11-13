# 🛡️ AI BullyShield powered by EmoSpace

### *Protection + Healing = Complete Digital Safety*

AI BullyShield is a Chrome extension and counselor dashboard that helps users identify cyberbullying, harassment, threats, and other harmful online content. It combines **AI-powered detection** with **emotional healing resources** to provide complete digital safety.

---

## ✨ Features

### Chrome Extension
- 🔍 **Text Analysis** — Analyze any text for cyberbullying, harassment, threats, abuse, discrimination, and self-harm indicators
- 💬 **Safe Reply Suggestions** — Get 3 carefully crafted reply options (calm, boundary-setting, neutral)
- 🫂 **Healing Center** — Grounding exercises, support resources, and crisis guidance
- 📋 **Incident Reporting** — Submit reports with optional anonymity and consent
- 🔒 **Privacy-First** — No automatic content scanning; user-initiated analysis only
- 🎨 **Beautiful UI** — Modern, accessible design with supportive language

### Counselor Dashboard
- 📊 **Overview** — Statistics on total, open, and high-risk reports
- 📝 **Report Management** — Search, filter, assign, and resolve reports
- 🔐 **Secure Access** — Firebase authentication with role-based authorization
- 📱 **Responsive** — Works on desktop and mobile

### Backend API
- 🤖 **Google Gemini AI** — Secure server-side AI analysis
- 🎭 **Demo Mode** — Full functionality without API keys for testing
- ⚡ **Rate Limiting** — Protection against abuse
- 🔒 **Security** — Input validation, sanitization, CORS, helmet

---

## 🚀 Quick Start (Windows)

### Prerequisites
- [Node.js](https://nodejs.org) v18 or later
- [Git](https://git-scm.com) (optional)
- Google Chrome browser

### Step 1: Setup

Open PowerShell in the project folder and run:

```powershell
# Install all dependencies and build shared package
npm run setup
```

Or use the setup script:
```powershell
.\scripts\setup.ps1
```

### Step 2: Configure (Optional)

Edit the `.env` file in the project root:

```env
# For AI analysis (get from https://aistudio.google.com/apikey)
GEMINI_API_KEY=your_key_here

# For Firebase (get from Firebase Console → Project Settings)
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
# ... other Firebase config

# Backend Firebase Admin config (same Firebase project)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=C:/secure/firebase-service-account.json
VITE_API_URL=http://localhost:3001
```

> **📝 Note:** The project works in **Demo Mode** without any API keys! Demo mode uses keyword-based analysis and is clearly labeled in the UI.

### Step 3: Start Development

```powershell
# Start the API server (http://localhost:3001)
npm run dev:api

# In a new terminal, start the dashboard (http://localhost:5173)
npm run dev:dashboard
```

### Step 4: Build & Load the Chrome Extension

```powershell
# Build the extension
npm run build:extension
```

Then load in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `apps/extension/dist` folder
5. The BullyShield icon appears in your toolbar!

### Step 5: Run Tests

```powershell
# Run all tests
npm test

# Or test individual components
npm run test:shared
npm run test:api
npm run test:extension
npm run test:dashboard
```

---

## 📁 Project Structure

```
ai-bullyshield/
├── apps/
│   ├── extension/          # Chrome Extension (Manifest V3)
│   │   ├── src/
│   │   │   ├── popup/      # React popup UI
│   │   │   ├── background/  # Service worker
│   │   │   └── content/    # Content script
│   │   ├── public/         # Static assets & manifest
│   │   └── dist/           # Built extension (load this in Chrome)
│   │
│   ├── dashboard/          # Counselor Dashboard (React)
│   │   └── src/
│   │       ├── App.tsx     # Login, report list, filters and updates
│   │       ├── contexts/   # Firebase counselor authentication
│   │       └── services/   # Firestore report and auth services
│   │
│   └── api/               # Backend API (Express + TypeScript)
│       └── src/
│           ├── routes/     # API endpoints
│           ├── services/   # Gemini AI, Firebase Admin
│           └── middleware/ # Auth, validation, rate limiting
│
├── packages/
│   └── shared/            # Shared types, validation, constants
│       └── src/
│
├── firebase/              # Firestore rules & indexes
├── scripts/               # Windows setup & dev scripts
├── .env.example           # Environment variable template
└── README.md              # This file
```

---

## 🔧 Technology Stack

| Component | Technology |
|-----------|-----------|
| Extension | Chrome Manifest V3, React 18, TypeScript, Vite, Tailwind CSS |
| Dashboard | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend API | Node.js, Express, TypeScript |
| AI | Google Gemini API (server-side) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Validation | Zod |
| Testing | Vitest |

---

## 🔒 Security & Privacy

- **No automatic scanning** — Text analysis only happens when you choose
- **API keys stay server-side** — Gemini key never leaves the backend
- **Input sanitization** — All text is sanitized against XSS and injection
- **Rate limiting** — API requests are rate-limited
- **Firestore rules** — Least-privilege access; reports only visible to counselors
- **Minimal permissions** — Extension requests `contextMenus`, `storage`, and access to its local API host
- **Anonymous reporting** — Reports can be submitted without identity
- **No browsing data** — The extension never collects browsing history

### Privacy Limitations
- Anonymous reports do not attach your account identity, but your IP address may be visible to the server/hosting provider
- Firebase may collect metadata as part of its standard operation
- When using the Gemini API, the analyzed text is sent to Google's servers

---

## 🎨 Demo Mode

When no API keys are configured, the project runs in **Demo Mode**:

- ✅ Text analysis uses keyword-based detection (deterministic)
- ✅ Safe replies return pre-written suggestions
- ✅ All UI features work normally
- ✅ Dashboard shows sample data
- ⚠️ Results are labeled as "Demo Mode"
- ⚠️ No data is saved to Firebase
- ⚠️ Analysis accuracy is lower than Gemini AI

Demo mode is perfect for:
- Development and testing
- Project demonstrations
- Running without API costs

---

## 🔥 Firebase Setup (Optional)

If you want live data storage and counselor accounts:

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** → **Email/Password**
3. Create a **Firestore Database** in production mode
4. Copy your web config to the `VITE_FIREBASE_*` values in `.env`. Set `FIREBASE_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_PATH` for local API report persistence. Keep the service-account JSON outside the repository.
5. Deploy security rules:
   ```bash
   cd firebase
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### Creating a Counselor Account
1. Create a user in Firebase Authentication
2. With the local service-account configuration in `.env`, run `node scripts/set-counselor-claim.mjs <firebase-user-uid>` from the project root.
3. Ask the counselor to sign out and back in so Firebase refreshes their ID token.

---

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Install dependencies and build shared package |
| `npm run dev:api` | Start API server in development mode |
| `npm run dev:dashboard` | Start dashboard in development mode |
| `npm run build:extension` | Build Chrome extension to `apps/extension/dist` |
| `npm run build:all` | Build all components |
| `npm test` | Run all test suites |
| `npm run lint` | Type-check all components |

---

## ⚠️ Important Notes

- **AI results are estimates**, not definitive judgments. Always use human judgment.
- The system does **not** diagnose mental health conditions.
- For self-harm or immediate danger, the system prioritizes directing users to human support.
- Safe reply suggestions must be reviewed by the user — nothing is sent automatically.
- This is an educational project and should not be used as a sole safety tool.

---

## 📄 License

This project was created as a final-year academic project.

---

*Built with 💜 — AI BullyShield powered by EmoSpace*
