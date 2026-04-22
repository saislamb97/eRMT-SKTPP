"use client";
import "../../../app/special.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../../components/Protected";
import RoleProtected from "../../../components/RoleProtected";
import NavBar from "../../../components/NavBar";
import { db } from "../../../lib/firebase";
import {
  collection, getDocs, query, orderBy,
  doc, deleteDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import { Trash2, RotateCcw, ArrowLeft, Clock } from "lucide-react";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function daysRemaining(deletedAt) {
  if (!deletedAt) return 30;
  const deletedMs = deletedAt.toDate ? deletedAt.toDate().getTime() : new Date(deletedAt).getTime();
  const diff = THIRTY_DAYS_MS - (Date.now() - deletedMs);
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

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
            <>
              <button onClick={onClose} className="auth-btn auth-btn-small-alt">Cancel</button>
              <button onClick={onConfirm} className="auth-btn auth-btn-primary">Confirm</button>
            </>
          ) : (
            <button onClick={onClose} className="auth-btn auth-btn-primary">OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeletedStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  const showPopup = (title, message, type = "info", onConfirm = null) =>
    setPopup({ title, message, type, onConfirm, showConfirm: !!onConfirm });
  const closePopup = () => setPopup(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [deletedSnap, gradesSnap] = await Promise.all([
          getDocs(query(collection(db, "deleted_students"), orderBy("deletedAt", "desc"))),
          getDocs(query(collection(db, "grades"), orderBy("Year"))),
        ]);
        const gradeList = gradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const now = Date.now();
        const list = deletedSnap.docs
          .map(d => {
            const data = d.data();
            const grade = gradeList.find(g => g.id === data.grade);
            return { id: d.id, ...data, gradeData: grade || null };
          })
          .filter(s => {
            // only show items deleted within 30 days
            if (!s.deletedAt) return true;
            const deletedMs = s.deletedAt.toDate
              ? s.deletedAt.toDate().getTime()
              : new Date(s.deletedAt).getTime();
            return now - deletedMs < THIRTY_DAYS_MS;
          });
        setStudents(list);
        setGrades(gradeList);
      } catch (err) {
        console.error("Error loading deleted students:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const restoreStudent = (s) => {
    showPopup(
      "Restore Student",
      `Restore ${s.name} back to the active student list?`,
      "confirm",
      async () => {
        closePopup();
        try {
          await addDoc(collection(db, "students"), {
            name: s.name,
            studentId: s.studentId,
            grade: s.grade,
            active: true,
            createdAt: serverTimestamp(),
          });
          await deleteDoc(doc(db, "deleted_students", s.id));
          setStudents(prev => prev.filter(x => x.id !== s.id));
          showPopup("Restored", `${s.name} has been restored successfully.`, "success");
        } catch (err) {
          showPopup("Error", "Failed to restore student", "error");
        }
      }
    );
  };

  const permanentDelete = (s) => {
    showPopup(
      "Permanent Delete",
      `Permanently delete ${s.name}? This cannot be undone.`,
      "confirm",
      async () => {
        closePopup();
        try {
          await deleteDoc(doc(db, "deleted_students", s.id));
          setStudents(prev => prev.filter(x => x.id !== s.id));
          showPopup("Deleted", `${s.name} has been permanently deleted.`, "success");
        } catch (err) {
          showPopup("Error", "Failed to delete student", "error");
        }
      }
    );
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "teacher"]}>
        <NavBar />
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}

        <div className="px-4 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/studentList")}
              className="auth-btn auth-btn-small-alt flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Clock size={22} className="text-red-400" /> Recently Deleted
              </h1>
              <p className="text-sm text-slate-500">
                {students.length} student{students.length !== 1 ? "s" : ""} — auto-purged after 30 days
              </p>
            </div>
          </div>

          {loading && (
            <div className="auth-glass rounded-xl p-8 text-center">Loading...</div>
          )}

          {!loading && students.length === 0 && (
            <div className="auth-glass rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🗑️</div>
              <p className="text-slate-500">No recently deleted students</p>
            </div>
          )}

          {!loading && students.length > 0 && (
            <div className="auth-glass rounded-xl p-4">
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto rounded-lg border bg-white/70">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr className="text-slate-600 text-left">
                      <th className="py-2 px-4">#</th>
                      <th className="py-2 px-4">ID</th>
                      <th className="py-2 px-4">Name</th>
                      <th className="py-2 px-4">Class</th>
                      <th className="py-2 px-4">Expires In</th>
                      <th className="py-2 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => {
                      const days = daysRemaining(s.deletedAt);
                      return (
                        <tr key={s.id} className="border-t hover:bg-slate-50 transition">
                          <td className="py-2 px-4 text-slate-500">{i + 1}</td>
                          <td className="py-2 px-4 font-mono font-bold text-purple-600">{s.studentId}</td>
                          <td className="py-2 px-4 font-medium">{s.name}</td>
                          <td className="py-2 px-4 text-slate-500">
                            {s.gradeData ? `Year ${s.gradeData.Year} — ${s.gradeData.name}` : "—"}
                          </td>
                          <td className="py-2 px-4">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 3 ? "bg-red-100 text-red-700" : days <= 7 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                              {days}d left
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right flex justify-end gap-3 items-center">
                            <button
                              className="text-emerald-600 hover:underline text-xs inline-flex items-center gap-1"
                              onClick={() => restoreStudent(s)}
                            >
                              <RotateCcw size={12} /> Restore
                            </button>
                            <button
                              className="text-red-600 hover:underline text-xs inline-flex items-center gap-1"
                              onClick={() => permanentDelete(s)}
                            >
                              <Trash2 size={12} /> Delete Forever
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {students.map((s) => {
                  const days = daysRemaining(s.deletedAt);
                  return (
                    <div key={s.id} className="rounded-lg bg-white border p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-sm font-mono font-bold text-purple-600">{s.studentId}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {s.gradeData ? `Year ${s.gradeData.Year} — ${s.gradeData.name}` : "—"}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days <= 3 ? "bg-red-100 text-red-700" : days <= 7 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {days}d left
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs flex items-center gap-1"
                          onClick={() => restoreStudent(s)}
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                        <button
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1"
                          onClick={() => permanentDelete(s)}
                        >
                          <Trash2 size={12} /> Delete Forever
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </RoleProtected>
    </Protected>
  );
}