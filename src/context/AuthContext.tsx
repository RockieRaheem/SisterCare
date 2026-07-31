"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { auth } from "@/lib/authClient";
import { getUserProfile, updateUserProfile } from "@/lib/dataClient";
import { clearPrivateClientData } from "@/lib/privacy";
import { UserProfile as FullUserProfile } from "@/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";

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
  signUp: (email: string, password: string, registrationIntent?: "member" | "counsellor") => Promise<{ emailConfirmationRequired: boolean }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  signInWithGoogle: (registrationIntent?: "member" | "counsellor") => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load the Postgres profile after the Supabase session has been verified.
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

      // The auth-user trigger owns normal profile creation. Dashboard-created
      // accounts may predate that trigger, so recover through a server route
      // using the verified session rather than bypassing RLS in the browser.
      if (!profile) {
        const { data } = await getSupabaseBrowserClient().auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Authentication session is unavailable");
        const response = await fetch("/api/profile/bootstrap", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Unable to initialize the account profile");
        profile = await getUserProfile(uid);
        if (!profile) throw new Error("Account profile was not created");
      }

      const deferredIntent = window.localStorage.getItem("sistercare-registration-intent");
      if (
        deferredIntent === "counsellor" &&
        profile.role === "member" &&
        profile.registrationIntent !== "counsellor"
      ) {
        await updateUserProfile(uid, { registrationIntent: "counsellor" });
        profile.registrationIntent = "counsellor";
      }
      window.localStorage.removeItem("sistercare-registration-intent");

      setUserProfile(profile);
    } catch (error: unknown) {
      console.error("Error loading the Supabase profile:", error);
      // Do not silently substitute a writable local profile for health data.
      // A retry is safe for transient failures; permission/configuration faults
      // remain visible rather than creating split-brain user records.
      if (retryCount < 2) {
        setTimeout(() => void loadUserProfile(uid, email, displayName, photoURL, retryCount + 1), 1500 * (retryCount + 1));
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
    const unsubscribe = auth.onAuthStateChanged(
      async (authenticatedUser) => {
        if (authenticatedUser) {
          const userData = {
            uid: authenticatedUser.uid,
            email: authenticatedUser.email,
            displayName: authenticatedUser.displayName,
            photoURL: authenticatedUser.photoURL,
          };
          setUser(userData);

          // Load Supabase profile
          await loadUserProfile(
            authenticatedUser.uid,
            authenticatedUser.email || "",
            authenticatedUser.displayName,
            authenticatedUser.photoURL,
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
    await auth.signInWithEmailAndPassword(email, password);
  };

  const signUp = async (email: string, password: string, registrationIntent: "member" | "counsellor" = "member") => {
    return auth.createUserWithEmailAndPassword(email, password, registrationIntent);
  };

  const signOut = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        const response = await fetch("/api/conversations", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          console.warn("Session-only conversations could not be removed before sign-out.");
        }
      }
    } catch (error) {
      console.warn("Could not remove session-only conversations during sign-out:", error);
    }
    try {
      await clearPrivateClientData();
    } catch (error) {
      console.warn("Could not clear all private client data during sign-out:", error);
    }
    await auth.signOut();
    setUser(null);
    setUserProfile(null);
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("Authentication required");
    const token = await currentUser.getIdToken(true);
    const response = await fetch("/api/account", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.error || "Account deletion failed");
    }
    await clearPrivateClientData();
    setUser(null);
    setUserProfile(null);
  };

  const signInWithGoogle = async (registrationIntent: "member" | "counsellor" = "member") => {
    await auth.signInWithGoogle(registrationIntent);
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
        deleteAccount,
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
