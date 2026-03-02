# SisterCare 💜

A comprehensive digital health companion for women's well-being, menstrual health tracking, and emotional support — built for the **AIFEST 2026 Hackathon**.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-orange?logo=firebase)
![Gemini AI](https://img.shields.io/badge/Gemini-2.5%20Flash--Lite-4285F4?logo=google)

## 🌸 Overview

SisterCare is a mobile-first Progressive Web App (PWA) designed specifically for women and girls in Uganda. It provides intelligent menstrual cycle tracking, an AI-powered health companion named "Sister," and culturally-sensitive health guidance.

### Key Highlights

- **AI Health Companion**: Powered by Google Gemini 2.5 Flash-Lite with function calling for intelligent, contextual responses
- **Smart Cycle Tracking**: Predictive period tracking with phase-aware insights
- **Multi-Language Support**: English and Luganda (Uganda's most spoken local language)
- **Offline-First PWA**: Works without internet connection
- **Crisis Detection**: Automatic detection of abuse/crisis situations with Uganda-specific resources
- **Privacy-Focused**: Your health data stays private and secure

## ✨ Features

### 🤖 AI Health Companion ("Sister")

- Natural conversational interface powered by Gemini 2.5 Flash-Lite
- Cycle-aware personalized responses
- Symptom logging and analysis
- Health information search with function calling
- Fertility window calculations
- Healthcare resource finder (Uganda-specific)
- Crisis detection with safety responses

### 📊 Cycle Tracking Dashboard

- Visual cycle phase indicator
- Days until next period prediction
- Symptom logging with mood tracking
- Flow intensity recording
- Historical cycle data
- Phase-specific health tips

### 📚 Health Library

- Expert-backed health articles
- Menstrual health education
- Self-care tips and guidance
- Searchable by category and topic

### 🌍 Multi-Language Support

- English (default)
- Luganda (Oluganda)
- Easy language switching in settings
- Culturally appropriate content

### 📱 Progressive Web App

- Install on home screen
- Offline support with smart caching (Service Worker v2)
- Push notifications for period reminders
- Fast, native-like mobile experience

### 🔒 Privacy & Security

- Firebase Authentication
- End-to-end data protection
- Private health data storage
- Secure API communications

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account
- Google AI Studio API key (for Gemini)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/RockieRaheem/SisterCare.git
cd SisterCare
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini AI (required for chat)
GEMINI_API_KEY=your_gemini_api_key
```

4. **Run the development server**

```bash
npm run dev
```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called "SisterCare"
3. Enable Authentication:
   - Email/Password provider
   - Google Sign-In provider
4. Create a Firestore database
5. Copy configuration to `.env.local`

## 🤖 Gemini AI Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Create an API key
3. Add to `.env.local` as `GEMINI_API_KEY`

The AI uses **Gemini 2.5 Flash-Lite** for:

- Fast response times
- Better rate limits on free tier
- Function calling for tool use (symptom logging, cycle info, etc.)

## 📁 Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── auth/                # Login & Signup
│   ├── chat/                # AI Chat interface
│   ├── dashboard/           # Main dashboard
│   ├── library/             # Health articles
│   ├── settings/            # User settings
│   ├── profile/             # User profile
│   ├── onboarding/          # New user setup
│   ├── counsellors/         # Professional help
│   ├── help/                # Help & FAQ
│   ├── about/               # About page
│   ├── api/                 # API routes
│   │   └── chat/            # AI Agent endpoint
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/
│   ├── ui/                  # Base UI components
│   ├── layout/              # Layout components (Header, Footer, BottomNav)
│   └── features/            # Feature components
├── context/
│   ├── AuthContext.tsx      # Authentication state
│   ├── ThemeContext.tsx     # Dark/light mode
│   └── LanguageContext.tsx  # i18n support
├── lib/
│   ├── firebase.ts          # Firebase config
│   ├── firestore.ts         # Database operations
│   ├── agent/               # AI Agent system
│   │   ├── executor.ts      # Agent loop with Gemini
│   │   ├── tools.ts         # Function definitions
│   │   └── knowledge.ts     # Health knowledge base
│   └── i18n/                # Translations (English, Luganda)
├── hooks/
│   └── useReminders.ts      # Reminder logic
├── types/
│   └── index.ts             # TypeScript types
└── public/
    ├── sw.js                # Service Worker v2 (PWA)
    └── manifest.json        # PWA manifest
```

## 🎨 Design System

| Token            | Value              |
| ---------------- | ------------------ |
| Primary Color    | `#8c30e8` (Purple) |
| Background Light | `#f7f6f8`          |
| Background Dark  | `#191121`          |
| Font Family      | Manrope            |
| Border Radius    | 12px (default)     |

### UI Features

- Glass morphism effects
- Smooth animations
- Responsive mobile-first design
- Dark mode support
- Custom scrollbars
- Loading skeletons

## 📱 Pages

| Route          | Description              |
| -------------- | ------------------------ |
| `/`            | Landing page             |
| `/auth/login`  | User login               |
| `/auth/signup` | User registration        |
| `/onboarding`  | New user setup           |
| `/dashboard`   | Cycle tracking dashboard |
| `/chat`        | AI companion chat        |
| `/library`     | Health articles          |
| `/profile`     | User profile             |
| `/settings`    | App settings             |
| `/counsellors` | Professional help        |
| `/help`        | Help & FAQ               |
| `/about`       | About SisterCare         |
| `/privacy`     | Privacy policy           |
| `/terms`       | Terms of service         |

## 🛠️ Tech Stack

| Category       | Technology                           |
| -------------- | ------------------------------------ |
| Framework      | Next.js 16.1 (App Router, Turbopack) |
| Language       | TypeScript                           |
| Styling        | Tailwind CSS                         |
| Authentication | Firebase Auth                        |
| Database       | Firebase Firestore                   |
| AI Model       | Google Gemini 2.5 Flash-Lite         |
| Icons          | Material Symbols Outlined            |
| Font           | Manrope (Google Fonts)               |
| PWA            | Custom Service Worker v2             |

## 📜 Scripts

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔐 Environment Variables

| Variable                                   | Description                  | Required |
| ------------------------------------------ | ---------------------------- | -------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase API key             | Yes      |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain         | Yes      |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase project ID          | Yes      |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket      | Yes      |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes      |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase app ID              | Yes      |
| `GEMINI_API_KEY`                           | Google Gemini API key        | Yes      |

## 🌍 Uganda-Specific Features

SisterCare is designed with Ugandan women in mind:

- **Local Language**: Full Luganda translation
- **Emergency Resources**:
  - Sauti 116 Helpline (toll-free, 24/7)
  - FIDA Uganda (women's legal support)
  - Uganda Police: 999 or 112
- **Cultural Sensitivity**: Appropriate health messaging
- **Low Data Usage**: PWA optimized for limited connectivity

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any platform supporting Next.js:

- Netlify
- Railway
- Google Cloud Run
- AWS Amplify

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💜 Acknowledgments

- Built for **AIFEST 2026 Hackathon**
- Designed to support women and girls in Uganda
- Powered by Google Gemini AI
- Created with love by the SisterCare Team

---

<p align="center">
  <strong>SisterCare</strong> — Your health companion, always by your side 💜
</p>

<p align="center">
  Made with 💜 for AIFEST 2026
</p>
