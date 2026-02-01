import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAitl1CLf2maEp_m-J34sTyYPxkVVHnWkM",
  authDomain: "sistercare-cbd5a.firebaseapp.com",
  projectId: "sistercare-cbd5a",
  storageBucket: "sistercare-cbd5a.firebasestorage.app",
  messagingSenderId: "791332150916",
  appId: "1:791332150916:web:81debfea641e42cfab6cd1",
  measurementId: "G-VGBVDZMPRB",
};

// Initialize Firebase only if it hasn't been initialized
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Analytics only on client side
let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export { analytics };
export default app;
