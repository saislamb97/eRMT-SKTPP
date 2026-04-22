// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDlEah5rojz9_yfsfOHjbwgUDOYKdSV93A",
  authDomain: "ermt-f4501.firebaseapp.com",
  projectId: "ermt-f4501",
  storageBucket: "ermt-f4501.firebasestorage.app",
  messagingSenderId: "320724640221",
  appId: "1:320724640221:web:f3a6d8ca68d15427769634",
  measurementId: "G-MFGDQZKPQM"
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);   
export const db = getFirestore(app);