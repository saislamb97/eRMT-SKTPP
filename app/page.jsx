"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/dashboard");
      else router.replace("/login");
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <span className="text-slate-500">Loading...</span>
    </div>
  );
}