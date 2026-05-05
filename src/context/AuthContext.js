import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const globalUserCache = (() => {
  try {
    const cached = localStorage.getItem('indus_user_cache');
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    return {};
  }
})();

const saveToGlobalCache = (uid, data) => {
  if (!uid) return;
  globalUserCache[uid] = data;
  try {
    localStorage.setItem('indus_user_cache', JSON.stringify(globalUserCache));
  } catch (e) {}
};

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
            setUserData({ uid: currentUser.uid, ...userDoc.data() });
          } else {
            // Legacy check for 'users' collection or brand new user
            const legacyDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (legacyDoc.exists()) {
              setUserData({ uid: currentUser.uid, ...legacyDoc.data() });
            } else {
              setUserData({ uid: currentUser.uid, exists: false });
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
    setUserData,
    userCache: globalUserCache,
    saveToCache: saveToGlobalCache
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
