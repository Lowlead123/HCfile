import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjRUJC0s_cD3Ihvl-RfkWVvBzHtp2u9rU",
  authDomain: "data-hc.firebaseapp.com",
  projectId: "data-hc",
  storageBucket: "data-hc.firebasestorage.app",
  messagingSenderId: "252595694082",
  appId: "1:252595694082:web:490a4ed8c3ddb23aadd51b",
  measurementId: "G-LYG95477EH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
