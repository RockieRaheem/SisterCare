"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getUserProfile } from "@/lib/firestore";
import { UserProfile as FullUserProfile } from "@/types";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  userProfile: FullUserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load user profile from Firestore with retry logic
  const loadUserProfile = async (
    uid: string,
    email: string,
    displayName: string | null,
    photoURL: string | null,
    retryCount = 0,
  ) => {
    setProfileLoading(true);
    try {
      let profile = await getUserProfile(uid);

      // Create profile if it doesn't exist
      if (!profile) {
        profile = await createUserProfile(uid, email, displayName, photoURL);
      }

      setUserProfile(profile);
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      console.error("Error loading user profile:", error);

      // If offline, create a temporary local profile and retry later
      if (
        firebaseError.message?.includes("offline") ||
        firebaseError.code === "unavailable"
      ) {
        console.log("Firestore offline, using temporary profile...");
        // Set a temporary profile so the user can continue
        setUserProfile({
          uid,
          email,
          displayName,
          photoURL,
          onboardingCompleted: false,
          preferences: {
            emailNotifications: true,
            pushNotifications: true,
            reminderDaysBefore: 3,
            theme: "system",
            language: "en",
          },
          cycleData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as FullUserProfile);

        // Retry loading after a delay (max 3 retries)
        if (retryCount < 3) {
          setTimeout(
            () => {
              loadUserProfile(
                uid,
                email,
                displayName,
                photoURL,
                retryCount + 1,
              );
            },
            3000 * (retryCount + 1),
          );
        }
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(
        user.uid,
        user.email || "",
        user.displayName,
        user.photoURL,
      );
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          setUser(userData);

          // Load Firestore profile
          await loadUserProfile(
            firebaseUser.uid,
            firebaseUser.email || "",
            firebaseUser.displayName,
            firebaseUser.photoURL,
          );
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Try to create user profile in Firestore, but don't block signup if offline
    try {
      await createUserProfile(result.user.uid, email, null, null);
    } catch (error) {
      console.warn(
        "Could not create profile in Firestore (may be offline):",
        error,
      );
      // Profile will be created when loadUserProfile runs with retry logic
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Try to check/create profile, but don't block sign-in if Firestore is offline
    try {
      const existingProfile = await getUserProfile(result.user.uid);
      if (!existingProfile) {
        await createUserProfile(
          result.user.uid,
          result.user.email || "",
          result.user.displayName,
          result.user.photoURL,
        );
      }
    } catch (error) {
      console.warn(
        "Could not sync profile to Firestore (may be offline):",
        error,
      );
      // Profile will be created/synced when loadUserProfile runs with retry logic
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        profileLoading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
