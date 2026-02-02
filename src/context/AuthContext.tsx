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

  // Load user profile from Firestore
  const loadUserProfile = async (
    uid: string,
    email: string,
    displayName: string | null,
    photoURL: string | null,
  ) => {
    setProfileLoading(true);
    try {
      let profile = await getUserProfile(uid);

      // Create profile if it doesn't exist
      if (!profile) {
        profile = await createUserProfile(uid, email, displayName, photoURL);
      }

      setUserProfile(profile);
    } catch (error) {
      console.error("Error loading user profile:", error);
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
    // Create user profile in Firestore
    await createUserProfile(result.user.uid, email, null, null);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    // Check if profile exists, if not create one
    const existingProfile = await getUserProfile(result.user.uid);
    if (!existingProfile) {
      await createUserProfile(
        result.user.uid,
        result.user.email || "",
        result.user.displayName,
        result.user.photoURL,
      );
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
