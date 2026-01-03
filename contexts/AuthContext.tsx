"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserData } from "@/types/user";
import { getAuthErrorMessage } from "@/app/auth/utils";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role?: 'admin') => Promise<void>;
  signIn: (email: string, password: string, role: 'admin') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            // Only allow admin users
            if (data.role === 'admin') {
              setUserData({
                uid: user.uid,
                email: user.email!,
                name: data.name,
                role: 'admin',
              });
            } else {
              // If not admin, sign out
              await signOut(auth);
              setUser(null);
              setUserData(null);
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ensureUserDocument = async (user: User, name: string) => {
    const userDocRef = doc(db, "users", user.uid);
    
    try {
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const userData = {
          email: user.email,
          name,
          role: 'admin',
          createdAt: new Date(),
        };
        await setDoc(userDocRef, userData);
        return userData;
      }
      
      return userDoc.data();
    } catch (error) {
      console.error("Error ensuring user document:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userData = await ensureUserDocument(userCredential.user, name);
      setUser(userCredential.user);
      setUserData({
        uid: userCredential.user.uid,
        email: userCredential.user.email!,
        name: userData.name,
        role: 'admin',
      });
    } catch (error) {
      if (error instanceof FirebaseError) {
        throw new Error(getAuthErrorMessage(error));
      }
      throw new Error((error as Error).message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error("Account not properly set up. Please contact support.");
      }

      const userData = userDoc.data();
      const role = userData.role;

      if (role !== 'admin') {
        await signOut(auth);
        throw new Error("You do not have admin privileges.");
      }

      setUser(userCredential.user);
      setUserData({
        uid: userCredential.user.uid,
        email: userCredential.user.email!,
        name: userData.name,
        role: 'admin',
      });
    } catch (error) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("Error signing out after failed sign in:", signOutError);
      }

      if (error instanceof FirebaseError) {
        throw new Error(getAuthErrorMessage(error));
      }
      
      throw new Error("Invalid email id or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Error during logout:", error);
      throw new Error("Failed to log out. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, signUp, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);