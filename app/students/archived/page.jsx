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
  doc, updateDoc
} from "firebase/firestore";
import { Archive, RotateCcw, ArrowLeft } from "lucide-react";

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

export default function ArchivedStudentsPage() {
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
        const [studentsSnap, gradesSnap] = await Promise.all([
          getDocs(query(collection(db, "students"), orderBy("name"))),
          getDocs(query(collection(db, "grades"), orderBy("Year"))),
        ]);
        const gradeList = gradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const archivedList = studentsSnap.docs
          .map(d => {
            const data = d.data();
            const grade = gradeList.find(g => g.id === data.grade);
            return { id: d.id, ...data, gradeData: grade || null };
          })
          .filter(s => s.active === false);
        setStudents(archivedList);
        setGrades(gradeList);
      } catch (err) {
        console.error("Error loading archived students:", err);
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
          await updateDoc(doc(db, "students", s.id), { active: true });
          setStudents(prev => prev.filter(x => x.id !== s.id));
          showPopup("Restored", `${s.name} is now active again.`, "success");
        } catch (err) {
          showPopup("Error", "Failed to restore student", "error");
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
                <Archive size={22} className="text-amber-500" /> Archived Students
              </h1>
              <p className="text-sm text-slate-500">
                {students.length} archived student{students.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {loading && (
            <div className="auth-glass rounded-xl p-8 text-center">Loading...</div>
          )}

          {!loading && students.length === 0 && (
            <div className="auth-glass rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-slate-500">No archived students</p>
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
                      <th className="py-2 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id} className="border-t hover:bg-slate-50 transition">
                        <td className="py-2 px-4 text-slate-500">{i + 1}</td>
                        <td className="py-2 px-4 font-mono font-bold text-purple-600">{s.studentId}</td>
                        <td className="py-2 px-4 font-medium">{s.name}</td>
                        <td className="py-2 px-4 text-slate-500">
                          {s.gradeData ? `Year ${s.gradeData.Year} — ${s.gradeData.name}` : "—"}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <button
                            className="text-emerald-600 hover:underline text-xs inline-flex items-center gap-1"
                            onClick={() => restoreStudent(s)}
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {students.map((s) => (
                  <div key={s.id} className="rounded-lg bg-white border p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-sm font-mono font-bold text-purple-600">{s.studentId}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {s.gradeData ? `Year ${s.gradeData.Year} — ${s.gradeData.name}` : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs flex items-center gap-1"
                        onClick={() => restoreStudent(s)}
                      >
                        <RotateCcw size={12} /> Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </RoleProtected>
    </Protected>
  );
}