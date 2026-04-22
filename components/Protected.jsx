"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function Protected({ children }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) throw new Error("not auth");
        // REMOVED: emailVerified check

        const snap = await getDoc(doc(db, "teachers", user.uid));
        if (!snap.exists() || !snap.data().verified) throw new Error("not approved");

        setOk(true);
      } catch {
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, []);

  if (!ok) return null;
  return children;
}