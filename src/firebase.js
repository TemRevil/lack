import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCxvhMQt4Z6nfbYyR7nv9aW57fDVO-tweE",
    authDomain: "lack-v.firebaseapp.com",
    projectId: "lack-v",
    storageBucket: "lack-v.firebasestorage.app",
    messagingSenderId: "117204444860",
    appId: "1:117204444860:web:a15581d39c2d06b94f52b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
