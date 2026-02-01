# SisterCare

A Digital Support Platform for Women's Well-Being, Guidance, and Menstrual Health built with Next.js 14.

## 🌸 Features

- **Menstrual Cycle Tracking**: Track your cycle with predictive insights and reminders
- **Emotional Support Chat**: AI-powered chat for emotional guidance and support
- **Guidance Library**: Expert-backed articles on menstrual health and well-being
- **Privacy-First**: End-to-end encryption and strong privacy controls
- **Dark Mode**: Full dark mode support for comfortable viewing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account (for authentication)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/sistercare.git
cd sistercare
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase configuration values

```bash
cp .env.example .env.local
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called "SisterCare"
3. Enable Authentication with Email/Password and Google providers
4. Create a Firestore database
5. Copy your config values to `.env.local`

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/         # Main dashboard
│   ├── chat/              # Support chat
│   ├── library/           # Guidance library
│   ├── settings/          # Settings & privacy
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Toggle.tsx
│   └── layout/           # Layout components
│       ├── Header.tsx
│       └── Footer.tsx
├── context/              # React context providers
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
└── lib/                  # Utility functions
    └── firebase.ts       # Firebase configuration
```

## 🎨 Design System

| Token            | Value     |
| ---------------- | --------- |
| Primary Color    | `#8c30e8` |
| Background Light | `#f7f6f8` |
| Background Dark  | `#191121` |
| Font Family      | Manrope   |

## 📱 Pages

- `/` - Landing/Welcome page
- `/auth/login` - Login page
- `/auth/signup` - Sign up page
- `/dashboard` - Main dashboard with cycle tracking
- `/chat` - AI Support chat
- `/library` - Guidance & advice library
- `/settings` - Settings & privacy controls

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Icons**: Material Symbols

## 📜 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔐 Environment Variables

| Variable                                   | Description                  |
| ------------------------------------------ | ---------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Firebase API key             |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Firebase auth domain         |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Firebase project ID          |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Firebase storage bucket      |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Firebase app ID              |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 💜 Acknowledgments

SisterCare is designed with love to support women and girls in their health journey. Your well-being matters.

---

Made with 💜 by the SisterCare Team
