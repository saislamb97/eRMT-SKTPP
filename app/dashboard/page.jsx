"use client";

import Protected from "../../components/Protected";
import NavBar from "../../components/NavBar";
import { auth, db } from "../../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Users, UserCheck, UserX } from "lucide-react";

export default function DashboardPage() {
  const [teacher, setTeacher] = useState(null);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });

  const today = useMemo(() => new Date(), []);
  const dayString = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const ROLE_LABELS = {
    admin: "Administrator",
    finance: "Finance",
    canteen: "Canteen Operator",
    teacher: "Teacher",
  };

  // Load current user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "teachers", user.uid));
        if (snap.exists()) setTeacher({ id: user.uid, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, []);

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const studentsSnap = await getDocs(collection(db, "students"));
        const total = studentsSnap.size;

        const presentSnap = await getDocs(query(
          collection(db, "attendance"),
          where("day", "==", dayString),
          where("present", "==", true)
        ));
        const present = presentSnap.size;
        const absent = total - present;

        setStats({ total, present, absent });
      } catch (err) {
        console.error("Dashboard stats load failed:", err);
      }
    };

    loadStats();
  }, [dayString]);

  // Pie chart helpers
  const pieData = [
    { label: "Present", value: stats.present, color: "#10b981", percentage: stats.total === 0 ? 0 : (stats.present / stats.total) * 100 },
    { label: "Absent", value: stats.absent, color: "#f43f5e", percentage: stats.total === 0 ? 0 : (stats.absent / stats.total) * 100 },
  ];

  let currentAngle = -90;
  const pieSlices = pieData.map((item) => {
    const angle = (item.percentage / 100) * 360;
    const slice = { ...item, startAngle: currentAngle, angle };
    currentAngle += angle;
    return slice;
  });

  const polarToCartesian = (cx, cy, r, angle) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const createArc = (cx, cy, r, start, end) => {
    const s = polarToCartesian(cx, cy, r, end);
    const e = polarToCartesian(cx, cy, r, start);
    const largeArc = end - start <= 180 ? "0" : "1";
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 0 ${e.x} ${e.y} Z`;
  };

  const roleLabel = ROLE_LABELS[teacher?.role] ?? teacher?.role;

  return (
    <Protected>
      <NavBar />
      <div className="px-4 py-6 space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>

        {/* USER CARD */}
        <div className="auth-glass rounded-xl p-4 flex items-center gap-4">
          <div className="mobile-avatar">
            {teacher?.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <div className="font-semibold">{teacher?.name}</div>
            <div className="text-sm text-slate-500">
              {roleLabel} · {teacher?.email}
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Students", value: stats.total, icon: Users, color: "from-blue-500 to-cyan-500" },
            { label: "Present Today", value: stats.present, icon: UserCheck, color: "from-green-500 to-emerald-500" },
            { label: "Absent Today", value: stats.absent, icon: UserX, color: "from-rose-500 to-pink-500" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="auth-glass rounded-xl p-4">
                <div className={`p-2 w-fit rounded-lg bg-gradient-to-br ${item.color}`}>
                  <Icon className="text-white" size={20} />
                </div>
                <div className="text-2xl font-semibold mt-2">{item.value}</div>
                <div className="text-sm text-slate-500">{item.label}</div>
              </div>
            );
          })}
        </div>

        {/* STATUS BREAKDOWN */}
        <div className="auth-glass rounded-xl p-4">
          <h3 className="font-semibold mb-4">Status Breakdown</h3>
          <div className="flex justify-center mb-4">
            <svg viewBox="0 0 200 200" className="w-40 h-40">
              {stats.total > 0 && stats.present === stats.total && (
                <circle cx="100" cy="100" r="80" fill="#10b981" />
              )}
              {stats.total > 0 && stats.absent === stats.total && (
                <circle cx="100" cy="100" r="80" fill="#f43f5e" />
              )}
              {stats.present > 0 && stats.absent > 0 &&
                pieSlices.map((slice, i) => (
                  <path
                    key={i}
                    d={createArc(100, 100, 80, slice.startAngle, slice.startAngle + slice.angle)}
                    fill={slice.color}
                  />
                ))}
              <circle cx="100" cy="100" r="50" fill="white" />
              <text x="100" y="95" textAnchor="middle" className="text-xl font-bold fill-slate-700">{stats.total}</text>
              <text x="100" y="112" textAnchor="middle" className="text-xs fill-slate-500">Total</text>
            </svg>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Present: <strong>{stats.present}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500" />
              Absent: <strong>{stats.absent}</strong>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link href="/attendance" className="auth-glass rounded-xl p-4">📱 Scan Attendance</Link>
          <Link href="/attendance/view" className="auth-glass rounded-xl p-4">📊 View Attendance</Link>
          <Link href="/canteen" className="auth-glass rounded-xl p-4">🍽️ Canteen Operations</Link>
          <Link href="/borang" className="auth-glass rounded-xl p-4">📄 Reports</Link>
          <Link href="/attendance/generateqr" className="auth-glass rounded-xl p-4">🔳 QR Codes</Link>
        </div>
      </div>
    </Protected>
  );
}