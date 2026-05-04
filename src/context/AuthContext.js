import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Check students collection first
          let userDoc = await getDoc(doc(db, 'students', currentUser.uid));
          
          if (!userDoc.exists()) {
            // Check faculties collection if not found in students
            userDoc = await getDoc(doc(db, 'faculties', currentUser.uid));
          }

          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            // Legacy check for 'users' collection or brand new user
            const legacyDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (legacyDoc.exists()) {
              setUserData(legacyDoc.data());
            } else {
              setUserData({ exists: false });
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData({ exists: false });
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userData,
    loading,
    setUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
