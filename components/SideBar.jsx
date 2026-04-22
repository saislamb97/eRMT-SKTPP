"use client";

import "../app/dashboard/dashboard-ui.css";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import { auth, db } from "../lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { canAccessPage, getRoleLabel } from "../lib/roles";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/attendance", label: "Scan", icon: "📱" },
  { href: "/attendance/view", label: "Attendance", icon: "📊" },
  { href: "/canteen", label: "Canteen", icon: "🍽️" },
  { href: "/borang", label: "Borang", icon: "📄" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [teacher, setTeacher] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "teachers", user.uid));
        if (snap.exists()) setTeacher({ id: user.uid, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, []);

  const accessibleLinks = useMemo(() => {
    if (!teacher) return [];
    return links.filter((l) => canAccessPage(teacher, l.href));
  }, [teacher]);

  const doLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <>
      {collapsed && (
        <div
          className="dash-overlay lg:hidden fixed inset-0 z-40"
          onClick={() => setCollapsed(false)}
        />
      )}

      <aside className={clsx(
        "dash-sidebar fixed top-0 left-0 h-screen w-64 z-50 transition-transform",
        collapsed ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 border-b">
          <div className="font-semibold">e-RMT SKTPP</div>
          <div className="text-xs text-slate-500">Sekolah Taman Putra Perdana</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {accessibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setCollapsed(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                pathname === link.href ? "bg-slate-900 text-white" : "hover:bg-slate-100"
              )}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center">
              {getInitials(teacher?.name)}
            </div>
            <div>
              <div className="text-sm font-semibold">{teacher?.name}</div>
              <div className="text-xs text-slate-500">{getRoleLabel(teacher)}</div>
            </div>
          </div>
          <button onClick={doLogout} className="mt-3 w-full text-sm text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </aside>

      <div className="hidden lg:block w-64" />
    </>
  );
}