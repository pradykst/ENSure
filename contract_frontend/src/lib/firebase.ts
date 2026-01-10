import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDcuSp0152x80ocz7hrqFFYWaj9HK-GB7A",
  authDomain: "ethglobal-e3029.firebaseapp.com",
  projectId: "ethglobal-e3029",
  storageBucket: "ethglobal-e3029.firebasestorage.app",
  messagingSenderId: "562887644165",
  appId: "1:562887644165:web:77320675b4f79e16a1f86c",
  measurementId: "G-W6YPS4XC3X"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);