"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function RoleProtected({ children, allowedRoles }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) { router.replace("/login"); return; }

        const snap = await getDoc(doc(db, "teachers", user.uid));
        if (!snap.exists()) { router.replace("/login"); return; }

        const data = snap.data();
        if (!data.verified) { router.replace("/alert"); return; }

        const role = data.role?.toLowerCase();
        const allowed = allowedRoles.map(r => r.toLowerCase());
        if (!allowed.includes(role)) { router.replace("/alert"); return; }

        setOk(true);
      } catch {
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [allowedRoles]);

  if (!ok) return null;
  return children;
}