
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch extended profile from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Merge with default structure to handle schema migrations (e.g. missing purchasedTools)
          setUserProfile({
            uid: user.uid,
            email: user.email || '',
            role: 'user',
            plan: 'Free',
            credits: 0,
            currency: 'USD',
            isBanned: false,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            photoURL: user.photoURL || '',
            ...data,
            purchasedTools: data.purchasedTools || [] // Critical fix: Ensure array exists
          } as UserProfile);
        } else {
          // Create basic user profile if not exists
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            role: 'user', // Default role
            isBanned: false,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            photoURL: user.photoURL || '',
            // Initialize required fields from UserProfile interface
            currency: 'USD',
            plan: 'Free',
            credits: 10,
            purchasedTools: []
          };
          await setDoc(docRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = () => {
    return signOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (currentUser) {
       await updateDoc(doc(db, "users", currentUser.uid), data);
       setUserProfile(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdmin: userProfile?.role === 'admin' || userProfile?.role === 'superadmin',
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
