# SisterCare - Complete System Overview

## What is SisterCare?

**SisterCare** is a digital support platform designed specifically for women's well-being, menstrual health guidance, and emotional support. The app is primarily built for women in **Uganda**, providing culturally-sensitive health education, period tracking, and access to professional counsellors.

Think of it as a **trusted digital sister** who helps women:

- Track their menstrual cycles
- Understand their bodies better
- Get emotional support when needed
- Connect with real healthcare professionals
- Learn about women's health through educational content

---

## Who Is This App For?

- **Young women and girls** learning about their menstrual health
- **Adult women** who want to track their cycles and manage symptoms
- **Anyone seeking judgment-free guidance** on sensitive health topics
- **Women in Uganda** (the app includes local emergency contacts and cultural context)

---

## Core Features (What's Built)

### 1. 🔐 User Authentication (Complete)

**Location:** `src/app/auth/login/` and `src/app/auth/signup/`

Users can:

- Create an account using email and password
- Sign in to access their personal dashboard
- Their data is securely stored in Firebase

**How it works:** Firebase Authentication handles user accounts securely.

---

### 2. 📝 Onboarding Flow (Complete)

**Location:** `src/app/onboarding/`

When a new user signs up, they go through a friendly welcome process:

1. **Welcome screen** - Introduction to SisterCare
2. **Name collection** - User enters their display name
3. **Cycle information** - User enters:
   - Last period start date
   - Average cycle length (default: 28 days)
   - Average period length (default: 5 days)
4. **Reminder preferences** - How many days before period to get reminders
5. **Completion** - User is taken to their dashboard

---

### 3. 📊 Dashboard - Cycle Tracking (Complete)

**Location:** `src/app/dashboard/`

The dashboard shows users:

**Cycle Information:**

- Current day in the menstrual cycle (e.g., "Day 14 of 28")
- Current phase (Menstrual, Follicular, Ovulation, or Luteal)
- Days until next period with countdown
- Visual progress ring showing cycle progress

**The Four Cycle Phases Explained:**
| Phase | Days | What's Happening | How You Might Feel |
|-------|------|------------------|---------------------|
| Menstrual | 1-5 | Period bleeding | Tired, need rest |
| Follicular | 6-13 | Body preparing | Energy increasing |
| Ovulation | 14-16 | Peak fertility | Highest energy, social |
| Luteal | 17-28 | Pre-period | Energy decreasing, PMS |

**Daily Mood Logging:**

- Users can log how they feel: 😊 Good, 😴 Tired, 😔 Low, 🤩 Great
- Mood data is saved to track patterns

**Period Reminders:**

- Banner notification when period is approaching
- Shows countdown to next expected period

---

### 4. 💬 Sister Chat - Support Companion (Complete)

**Location:** `src/app/chat/` and `src/app/api/chat/`

A chat interface where users can:

- Talk to "Sister" - an AI-powered wellness companion
- Get answers about menstrual health questions
- Receive emotional support without judgment
- Ask sensitive questions they might be embarrassed to ask elsewhere

**Key Features:**

- Conversation history saved per user
- Multiple chat conversations supported
- Predefined "icebreaker" questions for new users
- Crisis detection - if someone mentions abuse or self-harm, the system provides Uganda emergency contacts (Sauti 116, Police 999, FIDA Uganda)

**Powered by:** Google Gemini AI with a fallback system for common questions

---

### 5. 📚 Library - Educational Content (Complete)

**Location:** `src/app/library/`

A collection of articles organized by category:

- **Comfort & Hygiene** - Managing cramps, choosing products
- **Emotional Well-being** - Mindfulness, managing mood swings
- **Medical** - When to see a doctor
- **Nutrition & Diet** - Foods that help during periods

Each article includes:

- Title and description
- Read time estimate
- Tags (Beginner's Guide, Most Popular, Latest)
- Full content

**Example Articles:**

- Managing Period Cramps: Natural Remedies
- Understanding Your Menstrual Cycle Phases
- When to See a Doctor About Your Period
- Foods That Help During Your Period

---

### 6. 👩‍⚕️ Counsellors Directory (Complete)

**Location:** `src/app/counsellors/`

A directory of professional counsellors users can contact:

**Features:**

- Counsellor profiles with photos, bios, specializations
- Filter by specialty (Mental Health, Reproductive Health, Nutrition, etc.)
- Filter by status (Available, Busy, Offline)
- Search by name or specialty
- Languages spoken (English, Luganda, Swahili, Luo)
- Years of experience and ratings

**Contact Options:**

- Direct phone call button
- WhatsApp message button

**Current Counsellors (Mock Data):**
| Name | Specialty | Languages |
|------|-----------|-----------|
| Dr. Sarah Namugga | Clinical Psychologist | English, Luganda, Swahili |
| Ms. Grace Achieng | Reproductive Health | English, Luo |
| Dr. Faith Nakamya | Nutritionist | English, Luganda |
| Dr. Patience Nabirye | Relationship Counselling | English, Luganda, Runyankole |
| Ms. Mercy Atim | Adolescent Health | English, Luo |
| Dr. Prossy Kyomuhendo | Pregnancy & Postpartum | English, Luganda |

---

### 7. ⚙️ Settings Page (Complete)

**Location:** `src/app/settings/`

Users can configure:

- **Email Notifications** - Toggle on/off
- **Push Notifications** - Toggle on/off + Browser permission
- **Reminder Timing** - Days before period (1-7 days)
- **Theme** - Light mode, Dark mode, or System preference
- **Account** - Sign out option

---

### 8. 👤 Profile Page (Complete)

**Location:** `src/app/profile/`

Users can update:

- Display name
- Last period date
- Average cycle length
- Average period length
- Notification preferences

---

### 9. 📄 Static Pages (Complete)

- **About** (`/about`) - Information about SisterCare
- **Help** (`/help`) - FAQ page with emergency contacts
- **Privacy Policy** (`/privacy`) - Data handling practices
- **Terms of Service** (`/terms`) - Usage terms

---

### 10. 🎨 Design System (Complete)

**Colors:**

- Primary: Purple (#8c30e8)
- Backgrounds: Light (#f7f6f8) and Dark (#191121)

**Font:** Manrope (Google Fonts)

**Icons:** Material Symbols Outlined

**Features:**

- Full dark mode support
- Responsive design (mobile and desktop)
- Smooth animations and transitions
- Bottom navigation for mobile

---

## Technical Architecture

```
Frontend: Next.js 14 (App Router)
Language: TypeScript
Styling: Tailwind CSS
Authentication: Firebase Auth
Database: Firebase Firestore
AI Chat: Google Gemini API
Deployment: (Not yet deployed)
```

---

## What's Missing / Needs Improvement

### 🔴 Critical (Must Have Before Launch)

1. **Real Counsellor Data**
   - Currently using mock/placeholder data
   - Need to onboard actual counsellors in Uganda
   - Need verification process for counsellors

2. **Period Logging Button Missing**
   - Dashboard mentions logging but button is commented out
   - Users need ability to manually log when period starts/ends

3. **Symptom Logging Not Fully Functional**
   - SymptomLoggerModal component exists but not integrated
   - Should allow logging: flow intensity, cramps, headaches, etc.

4. **Data Export Feature**
   - Mentioned in Help page but not implemented
   - Users should be able to download their cycle data

5. **Email Notifications**
   - Toggle exists but no email sending system
   - Need integration with email service (SendGrid, etc.)

6. **Push Notifications**
   - Browser notifications work but not persistent
   - Need service worker for background notifications

### 🟡 Important (Should Have)

7. **Period History View**
   - Users can't see past cycles
   - Need calendar or history view

8. **Cycle Statistics/Insights**
   - Average cycle length over time
   - Pattern recognition
   - Symptom correlations

9. **Password Reset Flow**
   - No forgot password functionality visible

10. **Account Deletion**
    - Mentioned in privacy but not implemented
    - Required for data privacy compliance

11. **Language Support**
    - Settings has language option but only English works
    - Need Luganda, Swahili translations

12. **Onboarding Skip Option**
    - Users must complete onboarding
    - Should allow skip/complete later

13. **Article Detail View**
    - Library shows articles but no dedicated read page
    - Content shows on hover only

### 🟢 Nice to Have (Future Enhancements)

14. **In-App Counsellor Chat**
    - Currently only phone/WhatsApp
    - Real-time chat within app would be better

15. **Appointment Booking**
    - Schedule consultations with counsellors

16. **Community Features**
    - Anonymous forums for peer support
    - Success stories

17. **Water/Medication Reminders**
    - Track water intake
    - Medication reminders

18. **Partner Sharing**
    - Option to share cycle info with partner

19. **Offline Mode**
    - App should work without internet for basic features

20. **Admin Dashboard**
    - Manage counsellors
    - View analytics
    - Content management

---

## Data Privacy Summary

**What we collect:**

- Email and display name
- Cycle data (dates, lengths)
- Mood and symptom logs
- Chat conversations

**Security:**

- Firebase Authentication
- Data encrypted in Firestore
- No third-party data sharing for advertising

**User Rights:**

- View all personal data
- Export data (to be implemented)
- Delete account (to be implemented)

---

## Emergency Resources (Built In)

The app prominently displays Uganda-specific emergency contacts:

- **Sauti 116** - Free 24/7 helpline for abuse victims
- **Police** - 999 or 112
- **FIDA Uganda** - 0414 530 848 (Women's legal support)

These appear:

- In the AI chat when crisis keywords detected
- On the Help page
- In the AI's responses about abuse/violence

---

## How to Run the App

### Prerequisites

- Node.js 18 or higher
- Firebase project with Auth and Firestore enabled
- Google Gemini API key (optional, for AI chat)

### Setup

```bash
# Clone repository
git clone https://github.com/Kisakye5308/SisterCare.git
cd SisterCare

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Fill in Firebase and Gemini API keys

# Run development server
npm run dev

# Open http://localhost:3000
```

### Environment Variables Needed

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
GEMINI_API_KEY=
```

---

## Summary

**SisterCare is approximately 70% complete** as a functional MVP (Minimum Viable Product).

**Ready now:**

- User registration and login
- Period cycle tracking with predictions
- AI chat companion
- Educational content library
- Counsellor directory with contact info
- Settings and profile management

**Needed for launch:**

- Real counsellor onboarding
- Period start/end logging button
- Full symptom tracking
- Data export compliance
- Email notification system

The foundation is solid. With the critical features implemented, SisterCare can launch as a valuable tool for women's health education and support in Uganda.
