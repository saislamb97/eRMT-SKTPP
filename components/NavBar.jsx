"use client";

import "../app/special.css";
import "../app/dashboard/dashboard-ui.css";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "../lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getCountFromServer } from "firebase/firestore";
import clsx from "clsx";
import { useState, useEffect } from "react";

const baseLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/studentList", label: "Students" },
  { href: "/attendance/view", label: "Attendance" },
  { href: "/attendance/generateqr", label: "QR Codes" },
  { href: "/canteen", label: "Canteen Op" },
  { href: "/borang", label: "Borang" },
];

const adminLinks = [
  { href: "/admin", label: "Admin Portal" },
];

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  // Clock
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString("en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load current user from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "teachers", user.uid));
        if (snap.exists()) setCurrentUser({ id: user.uid, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, []);

  // Notification count
  useEffect(() => {
    if (!currentUser) return;

    const loadUnreadCount = async () => {
      try {
        const role = currentUser.role;
        if (role === "teacher" || role === "canteen") { setUnreadCount(0); return; }

        let total = 0;

        if (role === "admin") {
          const q = query(collection(db, "teachers"), where("verified", "==", false));
          const snap = await getCountFromServer(q);
          total += snap.data().count;
        }

        if (role === "admin" || role === "finance") {
          const q = query(
            collection(db, "notifications"),
            where("status", "==", "unread"),
            where("recipient", "==", currentUser.id),
            where("type", "==", "invoice")
          );
          const snap = await getCountFromServer(q);
          total += snap.data().count;
        }

        setUnreadCount(total);
      } catch (err) {
        console.error("Failed to load notification count:", err);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const doLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const isAdmin = currentUser?.role === "admin";
  const links = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <div className="dash-topbar mb-6 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="auth-avatar-wrap">
              <div className="auth-avatar">
                <img src="/logo.png" alt="ERMT logo" className="auth-avatar-logo" />
              </div>
            </div>
            <div className="ml-9">
              <div className="text-xs text-slate-500">SK Taman Putra Perdana</div>
              <div className="dash-time text-xs mt-1">{currentTime}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center sm:gap-2 mt-4">
          <button
            onClick={() => router.push("/notifications")}
            className="dash-notification-btn relative p-2 transition-colors"
            aria-label="Notifications"
          >
            <span className="text-2xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            className="dash-menu-toggle sm:hidden px-3 py-1.5"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>

          <div className="hidden sm:flex items-center gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx("dash-navlink px-3 py-1.5 text-sm", pathname === l.href && "dash-navlink-active")}
              >
                {l.label}
              </Link>
            ))}
            <button className="dash-logout-btn px-3 py-1.5 text-sm" onClick={doLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-3 grid gap-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx("dash-navlink px-3 py-2 text-sm", pathname === l.href && "dash-navlink-active")}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <button className="dash-logout-btn px-3 py-2 text-sm" onClick={doLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}