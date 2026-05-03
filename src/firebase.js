import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCPwobokA3--LEarSwZNizJNC4Ko_ACbPo",
  authDomain: "indusuniversitybatchmates.firebaseapp.com",
  projectId: "indusuniversitybatchmates",
  storageBucket: "indusuniversitybatchmates.firebasestorage.app",
  messagingSenderId: "473968790173",
  appId: "1:473968790173:web:523f4f257ad90151c02274",
  measurementId: "G-YCS88PM9EM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
