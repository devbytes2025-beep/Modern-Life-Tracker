import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCxz9DyLfrdh21laP3H2OwPqLQSBfZl25I",
  authDomain: "life-tracker-71b6a.firebaseapp.com",
  projectId: "life-tracker-71b6a",
  storageBucket: "life-tracker-71b6a.firebasestorage.app",
  messagingSenderId: "895144544294",
  appId: "1:895144544294:web:61dd773f4e74248f383ee7",
  measurementId: "G-BNR42EVZY3"
};

let auth;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

export { auth };