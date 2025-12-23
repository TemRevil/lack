import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import fs from 'fs';
import crypto from 'crypto';

const firebaseConfig = {
    apiKey: "AIzaSyCxvhMQt4Z6nfbYyR7nv9aW57fDVO-tweE",
    authDomain: "lack-v.firebaseapp.com",
    projectId: "lack-v",
    storageBucket: "lack-v.firebasestorage.app",
    messagingSenderId: "117204444860",
    appId: "1:117204444860:web:a15581d39c2d06b94f52b9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const generateKeys = async () => {
    try {
        console.log("Signing in...");
        await signInWithEmailAndPassword(auth, "lack-v@lack.com", "!@wqsdXD@#1@1");
        console.log("Signed in successfully.");

        const keys = [];
        let count = 0;

        console.log("Generating 20 keys...");
        while (count < 20) {
            const key = crypto.randomUUID().toUpperCase();
            const docRef = doc(db, "Activision Keys", key);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                await setDoc(docRef, {
                    Status: "Available",
                    Date: "",
                    Time: ""
                });
                keys.push(key);
                count++;
                console.log(`Generated (${count}/20): ${key}`);
            }
        }

        fs.writeFileSync('generated_keys.txt', keys.join('\n'));
        console.log("\nAll keys generated and saved to generated_keys.txt");
        process.exit(0);
    } catch (error) {
        console.error("Error generating keys:", error);
        process.exit(1);
    }
};

generateKeys();
