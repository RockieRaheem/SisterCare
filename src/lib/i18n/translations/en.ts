/**
 * English translations for SisterCare
 * This is the default/fallback language
 */

export const en = {
  // Common
  common: {
    appName: "SisterCare",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    back: "Back",
    next: "Next",
    done: "Done",
    yes: "Yes",
    no: "No",
    ok: "OK",
    error: "Error",
    success: "Success",
    warning: "Warning",
    retry: "Retry",
    close: "Close",
    search: "Search",
    noResults: "No results found",
    seeAll: "See All",
    learnMore: "Learn More",
  },

  // Navigation
  nav: {
    home: "Home",
    dashboard: "Dashboard",
    chat: "Chat",
    library: "Library",
    settings: "Settings",
    profile: "Profile",
    counsellors: "Counsellors",
    help: "Help",
    logout: "Logout",
    login: "Login",
    signup: "Sign Up",
  },

  // Auth
  auth: {
    welcomeBack: "Welcome back",
    createAccount: "Create your account",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password?",
    rememberMe: "Remember me",
    loginButton: "Sign In",
    signupButton: "Create Account",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    orContinueWith: "Or continue with",
    google: "Continue with Google",
    termsAgree: "By signing up, you agree to our",
    termsOfService: "Terms of Service",
    and: "and",
    privacyPolicy: "Privacy Policy",
    loginSuccess: "Welcome back!",
    signupSuccess: "Account created successfully!",
    logoutSuccess: "You have been logged out",
    invalidCredentials: "Invalid email or password",
    emailRequired: "Email is required",
    passwordRequired: "Password is required",
    passwordMismatch: "Passwords do not match",
    weakPassword: "Password must be at least 6 characters",
  },

  // Dashboard
  dashboard: {
    greeting: "Hello",
    welcomeMessage: "How are you feeling today?",
    cycleDay: "Cycle Day",
    daysUntilPeriod: "days until period",
    periodIn: "Period in",
    currentPhase: "Current Phase",
    nextPeriod: "Next Period",
    periodStarted: "Period Started",
    logSymptoms: "Log Symptoms",
    viewCalendar: "View Calendar",
    quickActions: "Quick Actions",
    recentSymptoms: "Recent Symptoms",
    healthTips: "Health Tips",
    upcomingReminders: "Upcoming Reminders",
    noReminders: "No upcoming reminders",
    cyclePhases: {
      menstrual: "Menstrual",
      follicular: "Follicular",
      ovulation: "Ovulation",
      luteal: "Luteal",
    },
    phaseDescriptions: {
      menstrual: "Your period phase - rest and self-care time",
      follicular: "Energy rising - great for new projects",
      ovulation: "Peak energy - most fertile window",
      luteal: "Winding down - practice gentle self-care",
    },
  },

  // Chat
  chat: {
    title: "Chat with Sister",
    placeholder: "Type your message...",
    send: "Send",
    newChat: "New Chat",
    deleteChat: "Delete Chat",
    clearHistory: "Clear History",
    voiceInput: "Voice Input",
    listening: "Listening...",
    thinking: "Sister is thinking...",
    errorMessage: "Sorry, I couldn't process that. Please try again.",
    welcomeMessage:
      "Hello! I'm Sister, your supportive companion here at SisterCare. 💜 I'm here to listen, answer your questions about menstrual health, and provide emotional support. How are you feeling today?",
    icebreakers: {
      cramps: "How can I manage cramps naturally?",
      mood: "I'm feeling a bit anxious today",
      sleep: "Tips for better sleep during my period",
      cycle: "What phase of my cycle am I in?",
    },
  },

  // Library
  library: {
    title: "Health Library",
    subtitle: "Learn about your body and health",
    categories: {
      all: "All",
      menstrualHealth: "Menstrual Health",
      nutrition: "Nutrition",
      exercise: "Exercise",
      mentalHealth: "Mental Health",
      hygiene: "Hygiene",
      fertility: "Fertility",
    },
    readTime: "min read",
    bookmarked: "Bookmarked",
    bookmark: "Bookmark",
  },

  // Settings
  settings: {
    title: "Settings",
    account: "Account",
    preferences: "Preferences",
    notifications: "Notifications",
    privacy: "Privacy & Security",
    language: "Language",
    theme: "Theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    cycleSettings: "Cycle Settings",
    cycleLength: "Average Cycle Length",
    periodLength: "Average Period Length",
    days: "days",
    reminderSettings: "Reminder Settings",
    periodReminder: "Period Reminder",
    pillReminder: "Pill Reminder",
    exportData: "Export Health Data",
    deleteAccount: "Delete Account",
    deleteAccountWarning:
      "This action cannot be undone. All your data will be permanently deleted.",
    about: "About SisterCare",
    version: "Version",
    rateApp: "Rate the App",
    feedback: "Send Feedback",
    helpCenter: "Help Center",
  },

  // Profile
  profile: {
    title: "My Profile",
    personalInfo: "Personal Information",
    displayName: "Display Name",
    dateOfBirth: "Date of Birth",
    healthInfo: "Health Information",
    lastPeriod: "Last Period Date",
    averageCycle: "Average Cycle",
    updateProfile: "Update Profile",
    profileUpdated: "Profile updated successfully",
  },

  // Symptoms
  symptoms: {
    title: "Log Symptoms",
    howAreYou: "How are you feeling?",
    selectSymptoms: "Select your symptoms",
    painLevel: "Pain Level",
    noPain: "No pain",
    severe: "Severe",
    flowLevel: "Flow Level",
    none: "None",
    spotting: "Spotting",
    light: "Light",
    medium: "Medium",
    heavy: "Heavy",
    mood: "Mood",
    moods: {
      great: "Great",
      good: "Good",
      okay: "Okay",
      low: "Low",
      stressed: "Stressed",
    },
    categories: {
      physical: "Physical",
      digestive: "Digestive",
      emotional: "Emotional",
    },
    symptomList: {
      cramps: "Cramps",
      bloating: "Bloating",
      headache: "Headache",
      backache: "Back Pain",
      breastTenderness: "Breast Tenderness",
      fatigue: "Fatigue",
      nausea: "Nausea",
      acne: "Acne/Skin Issues",
      appetiteIncrease: "Increased Appetite",
      appetiteDecrease: "Decreased Appetite",
      cravings: "Food Cravings",
      constipation: "Constipation",
      diarrhea: "Diarrhea",
      moodSwings: "Mood Swings",
      anxiety: "Anxiety",
      irritability: "Irritability",
      sadness: "Sadness",
      sensitivity: "Emotional Sensitivity",
      brainFog: "Brain Fog",
    },
    sleepQuality: "Sleep Quality",
    energyLevel: "Energy Level",
    additionalNotes: "Additional Notes",
    notesPlaceholder:
      "Any other observations, triggers, or things you want to remember...",
    saveSymptoms: "Save Symptoms",
    symptomsSaved: "Symptoms logged successfully!",
  },

  // Onboarding
  onboarding: {
    welcome: "Welcome to SisterCare",
    tagline: "Your trusted companion for menstrual health",
    getStarted: "Get Started",
    skip: "Skip",
    step1Title: "Track Your Cycle",
    step1Desc: "Monitor your menstrual cycle and get accurate predictions",
    step2Title: "Log Symptoms",
    step2Desc: "Record how you're feeling and identify patterns",
    step3Title: "Get Support",
    step3Desc: "Chat with Sister AI for guidance and emotional support",
    setupTitle: "Let's Set Up Your Profile",
    whenLastPeriod: "When did your last period start?",
    howLongCycle: "How long is your typical cycle?",
    howLongPeriod: "How long does your period usually last?",
    completeSetup: "Complete Setup",
  },

  // Reminders
  reminders: {
    title: "Reminders",
    periodReminder: "Period Reminder",
    periodStartingSoon: "Your period is expected to start soon",
    medicationReminder: "Medication Reminder",
    customReminder: "Custom Reminder",
    addReminder: "Add Reminder",
    editReminder: "Edit Reminder",
    deleteReminder: "Delete Reminder",
    reminderSet: "Reminder set successfully",
    noReminders: "No reminders set",
  },

  // Counsellors
  counsellors: {
    title: "Professional Counsellors",
    subtitle: "Connect with certified health professionals",
    available: "Available",
    unavailable: "Unavailable",
    bookSession: "Book Session",
    viewProfile: "View Profile",
    specializations: "Specializations",
    experience: "years experience",
    languages: "Languages",
    ratings: "ratings",
  },

  // Help & Support
  help: {
    title: "Help & Support",
    faq: "Frequently Asked Questions",
    contactUs: "Contact Us",
    emergencyHelp: "Emergency Help",
    emergencyNumbers: "Emergency Numbers",
    reportIssue: "Report an Issue",
    sauti: "Sauti 116 Helpline",
    sautiDesc: "Free 24/7 helpline for children and families in Uganda",
    police: "Uganda Police",
    policeNumber: "999 or 112",
    fida: "FIDA Uganda",
    fidaDesc: "Free legal support for women",
  },

  // Time & Dates
  time: {
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
    days: "days",
    day: "day",
    hours: "hours",
    hour: "hour",
    minutes: "minutes",
    minute: "minute",
    ago: "ago",
    in: "in",
    months: {
      january: "January",
      february: "February",
      march: "March",
      april: "April",
      may: "May",
      june: "June",
      july: "July",
      august: "August",
      september: "September",
      october: "October",
      november: "November",
      december: "December",
    },
    weekdays: {
      sunday: "Sunday",
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
    },
  },

  // Errors
  errors: {
    somethingWentWrong: "Something went wrong",
    tryAgain: "Please try again",
    networkError: "Network error. Check your connection.",
    sessionExpired: "Your session has expired. Please login again.",
    permissionDenied: "Permission denied",
    notFound: "Not found",
    serverError: "Server error. Please try again later.",
  },
};

// Create a deep partial type that converts all string literals to string
// This allows other translation files to have different values while maintaining structure
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends object
      ? DeepStringify<T[K]>
      : T[K];
};

// Export the translation keys type based on the English translations structure
export type TranslationKeys = DeepStringify<typeof en>;
