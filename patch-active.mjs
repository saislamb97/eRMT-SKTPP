// patch-active.mjs
// Run with: node patch-active.mjs
// Adds active: true to every student document that is missing it

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

// Paste your firebaseConfig here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function patchStudents() {
  const snap = await getDocs(collection(db, "students"));
  let patched = 0;
  let skipped = 0;

  for (const student of snap.docs) {
    const data = student.data();
    if (data.active === undefined) {
      await updateDoc(doc(db, "students", student.id), { active: true });
      console.log(`✅ Patched: ${data.name}`);
      patched++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Patched: ${patched}, Already had active field: ${skipped}`);
  process.exit(0);
}

patchStudents().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});