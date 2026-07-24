import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDDCnM-XbSdH7k8BMy2cwrykhepPqxwN2Q",
  authDomain: "trademinddd.firebaseapp.com",
  projectId: "trademinddd",
  storageBucket: "trademinddd.firebasestorage.app",
  messagingSenderId: "697836220155",
  appId: "1:697836220155:web:9af1b6d7455befff8c8a5e",
  measurementId: "G-Z8YKR24F1E",
};

const app = initializeApp(firebaseConfig);

export { app };
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics =
  typeof window === "undefined"
    ? null
    : await isSupported().then((supported) => (supported ? getAnalytics(app) : null)).catch(() => null);