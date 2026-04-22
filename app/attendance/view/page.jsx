"use client";
import "../../special.css";
import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Protected from "../../../components/Protected";
import RoleProtected from "../../../components/RoleProtected";
import NavBar from "../../../components/NavBar";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc } from "firebase/firestore";

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function PopupModal({ title, message, type, onClose, onConfirm, showConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="auth-card auth-glass rounded-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className={`px-6 py-4 ${type === "success" ? "bg-emerald-500" : type === "error" ? "bg-red-500" : "bg-purple-600"} text-white`}>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="px-6 py-5"><p className="text-slate-700">{message}</p></div>
        <div className="px-6 py-4 flex justify-end gap-3">
          {showConfirm ? (
            <><button onClick={onClose} className="auth-btn auth-btn-small-alt">Cancel</button><button onClick={onConfirm} className="auth-btn auth-btn-primary">Confirm</button></>
          ) : (
            <button onClick={onClose} className="auth-btn auth-btn-primary">OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AttendanceViewPage() {
  const router = useRouter();
  const [gradeId, setGradeId] = useState("ALL");
  const [grades, setGrades] = useState([]);
  const [date, setDate] = useState(() => new Date());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [popup, setPopup] = useState(null);

  const showPopup = (title, message, type = "info", onConfirm = null) =>
    setPopup({ title, message, type, onConfirm, showConfirm: !!onConfirm });
  const closePopup = () => setPopup(null);
  const dayString = useMemo(() => getLocalDateString(date), [date]);

  useEffect(() => {
    const loadGrades = async () => {
      const snap = await getDocs(query(collection(db, "grades"), orderBy("name")));
      setGrades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    loadGrades();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        // Fetch all students, filter active client-side — no composite index needed
        const studentsSnap = await getDocs(query(collection(db, "students"), orderBy("name")));
        let students = studentsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => s.active !== false);

        // If a specific grade is selected, filter by grade too
        if (gradeId !== "ALL") {
          students = students.filter(s => s.grade === gradeId);
        }

        // Load attendance for the day
        const attendanceSnap = await getDocs(
          query(collection(db, "attendance"), where("day", "==", dayString))
        );
        const attendance = attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Load grades map
        const gradesSnap = await getDocs(collection(db, "grades"));
        const gradesMap = {};
        gradesSnap.docs.forEach(d => { gradesMap[d.id] = { id: d.id, ...d.data() }; });

        // Auto-create missing attendance records for active students only
        for (const s of students) {
          const exists = attendance.find(a => a.student === s.id);
          if (!exists) {
            const newRef = await addDoc(collection(db, "attendance"), {
              student: s.id,
              present: false,
              day: dayString,
              date: new Date().toISOString(),
            });
            attendance.push({ id: newRef.id, student: s.id, present: false, day: dayString });
          }
        }

        let mapped = students.map(s => {
          const record = attendance.find(a => a.student === s.id);
          const grade = gradesMap[s.grade] || null;
          return {
            id: s.id, studentId: s.studentId, name: s.name,
            gradeId: s.grade, gradeName: grade?.name || "-", gradeYear: grade?.Year || "-",
            present: record?.present || false, attendanceId: record?.id || null,
          };
        });

        mapped = mapped.sort((a, b) => {
          const y = (a.gradeYear || 0) - (b.gradeYear || 0);
          if (y !== 0) return y;
          const g = a.gradeName.localeCompare(b.gradeName);
          if (g !== 0) return g;
          return a.name.localeCompare(b.name);
        });

        setRows(mapped);
      } catch (err) {
        console.error("Error loading attendance:", err);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };
    load();
  }, [gradeId, dayString]);

  const updatePresentStatus = async (row, newValue) => {
    try {
      if (row.attendanceId) {
        await updateDoc(doc(db, "attendance", row.attendanceId), { present: newValue });
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, present: newValue } : r));
      } else {
        const newRef = await addDoc(collection(db, "attendance"), {
          student: row.id, present: newValue, day: dayString, date: new Date().toISOString()
        });
        setRows(prev => prev.map(r =>
          r.id === row.id ? { ...r, present: newValue, attendanceId: newRef.id } : r
        ));
      }
    } catch (err) {
      showPopup("Error", `Failed to update attendance: ${err.message}`, "error");
    }
  };

  const markAll = async (value) => {
    setLoading(true);
    try {
      for (const row of rows) {
        if (row.present === value) continue;
        if (row.attendanceId) {
          await updateDoc(doc(db, "attendance", row.attendanceId), { present: value });
        } else {
          await addDoc(collection(db, "attendance"), {
            student: row.id, present: value, day: dayString, date: new Date().toISOString()
          });
        }
      }
      setRows(prev => prev.map(r => ({ ...r, present: value })));
      showPopup("Success", `Marked all students as ${value ? "present" : "absent"}.`, "success");
    } catch (err) {
      showPopup("Error", "Failed to mark all students.", "error");
    } finally {
      setLoading(false);
    }
  };

  const presentCount = rows.filter(r => r.present).length;

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "teacher"]}>
        <NavBar />
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}
        <div className="min-h-screen py-6 px-4">
          <div className="max-w-6xl mx-auto fade-in space-y-6">
            <div className="auth-glass rounded-xl p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="auth-title">Student Attendance</h1>
                  <p className="text-sm opacity-60">{dayString}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">{presentCount} / {rows.length}</div>
                  <div className="text-xs opacity-60">Present Today</div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link href="/attendance" className="auth-btn auth-btn-purple flex items-center justify-center gap-2 py-3 text-sm w-full">
                  📸 Scan QR Code
                </Link>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => showPopup("Mark All Present", "Mark ALL students as present?", "confirm", async () => { closePopup(); await markAll(true); })}
                    className="auth-btn auth-btn-small-alt flex items-center justify-center gap-2 py-3 text-sm"
                    disabled={loading || rows.length === 0}
                  >
                    ✅ All Present
                  </button>
                  <button
                    onClick={() => showPopup("Mark All Absent", "Mark ALL students as absent?", "confirm", async () => { closePopup(); await markAll(false); })}
                    className="auth-btn auth-btn-small-alt flex items-center justify-center gap-2 py-3 text-sm"
                    disabled={loading || rows.length === 0}
                  >
                    ❌ All Absent
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select className="auth-input" value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="ALL">All Years & Classes</option>
                  {[...new Set(grades.map(g => g.Year))].sort((a, b) => a - b).map(year => (
                    <optgroup key={year} label={`Year ${year}`}>
                      {grades.filter(g => g.Year === year).sort((a, b) => a.name.localeCompare(b.name)).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="date"
                  className="auth-input"
                  value={getLocalDateString(date)}
                  onChange={(e) => setDate(new Date(e.target.value + 'T00:00:00'))}
                />
              </div>
            </div>

            {loading && <div className="auth-glass rounded-xl p-8 text-center">Loading...</div>}
            {!loading && rows.length === 0 && (
              <div className="auth-glass rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-slate-500 mb-4">No students found</p>
                <button onClick={() => router.push("/attendance/addStudent")} className="auth-btn auth-btn-primary">
                  ➕ Add First Student
                </button>
              </div>
            )}

            {!loading && rows.length > 0 && (
              <div className="auth-glass rounded-xl p-4">
                <div className="hidden md:block overflow-x-auto rounded-xl border bg-white/70">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr className="text-left text-slate-600">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-4">Year</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id} className="border-t hover:bg-slate-50 transition">
                          <td className="py-3 px-4 text-slate-500">{i + 1}</td>
                          <td className="py-3 px-4 font-mono font-semibold text-purple-700">{r.studentId}</td>
                          <td className="py-3 px-4">{r.gradeYear}</td>
                          <td className="py-3 px-4">{r.gradeName}</td>
                          <td className="py-3 px-4 font-medium">{r.name}</td>
                          <td className="py-3 px-4">
                            <select
                              className={`px-3 py-1 rounded-full text-sm font-medium border-0 cursor-pointer ${r.present ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                              value={r.present ? "Yes" : "No"}
                              onChange={(e) => updatePresentStatus(r, e.target.value === "Yes")}
                            >
                              <option value="Yes">✅ Present</option>
                              <option value="No">❌ Absent</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {rows.map((r, i) => (
                    <div key={r.id} className="rounded-xl border bg-white p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Year {r.gradeYear} • {r.gradeName}</p>
                          <p className="font-semibold">{r.name}</p>
                          <p className="text-sm text-purple-600 font-mono font-bold">{r.studentId}</p>
                        </div>
                        <span className="text-xs text-slate-400">#{i + 1}</span>
                      </div>
                      <div className="mt-3">
                        <select
                          className={`w-full px-3 py-2 rounded-lg text-sm font-medium border-0 ${r.present ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                          value={r.present ? "Yes" : "No"}
                          onChange={(e) => updatePresentStatus(r, e.target.value === "Yes")}
                        >
                          <option value="Yes">✅ Present</option>
                          <option value="No">❌ Absent</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && rows.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/attendance" className="auth-glass rounded-xl p-4 text-center hover:bg-purple-50 transition">📱 Scan Attendance</Link>
                <Link href="/attendance/studentList" className="auth-glass rounded-xl p-4 text-center hover:bg-purple-50 transition">📋 Student List</Link>
                <Link href="/attendance/generateqr" className="auth-glass rounded-xl p-4 text-center hover:bg-purple-50 transition">🔳 Generate QR</Link>
                <Link href="/attendance/addStudent" className="auth-glass rounded-xl p-4 text-center hover:bg-purple-50 transition">➕ Add Student</Link>
              </div>
            )}
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}