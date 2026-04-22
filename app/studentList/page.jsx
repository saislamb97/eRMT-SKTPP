"use client";
import "../special.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Protected from "../../components/Protected";
import RoleProtected from "../../components/RoleProtected";
import NavBar from "../../components/NavBar";
import { db } from "../../lib/firebase";
import {
  collection, getDocs, query, orderBy,
  doc, updateDoc, deleteDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import { Users, UserPlus, Edit, Trash2, Archive, RotateCcw, Clock } from "lucide-react";

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

export default function StudentListPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);
  const [editModal, setEditModal] = useState({
    open: false, id: "", name: "", studentId: "", year: "", grade: ""
  });

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
        const studentList = studentsSnap.docs
          .map(d => {
            const data = d.data();
            const grade = gradeList.find(g => g.id === data.grade);
            return { id: d.id, ...data, gradeData: grade || null };
          })
          .filter(s => s.active !== false); // only show active students
        setStudents(studentList);
        setGrades(gradeList);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = students.reduce((acc, s) => {
    const year = s.gradeData?.Year ?? "—";
    const gradeName = s.gradeData?.name ?? "—";
    if (!acc[year]) acc[year] = {};
    if (!acc[year][gradeName]) acc[year][gradeName] = [];
    acc[year][gradeName].push(s);
    return acc;
  }, {});

  const openEditModal = (s) => {
    setEditModal({
      open: true, id: s.id, name: s.name,
      studentId: s.studentId, year: s.gradeData?.Year || "", grade: s.grade
    });
  };

  const saveEdit = async () => {
    try {
      await updateDoc(doc(db, "students", editModal.id), {
        name: editModal.name,
        grade: editModal.grade
      });
      const selectedGrade = grades.find(g => g.id === editModal.grade);
      setStudents(prev =>
        prev.map(s => s.id === editModal.id
          ? { ...s, name: editModal.name, grade: editModal.grade, gradeData: selectedGrade }
          : s
        )
      );
      setEditModal({ ...editModal, open: false });
      showPopup("Success", "Student updated successfully", "success");
    } catch (err) {
      showPopup("Error", "Failed to update student", "error");
    }
  };

  // Soft delete — moves to deleted_students, removes from students
  const deleteStudent = (s) => {
    showPopup(
      "Delete Student",
      `Move ${s.name} to Recently Deleted? They can be restored within 30 days.`,
      "confirm",
      async () => {
        closePopup();
        try {
          await addDoc(collection(db, "deleted_students"), {
            name: s.name,
            studentId: s.studentId,
            grade: s.grade,
            active: s.active ?? true,
            deletedAt: serverTimestamp(),
          });
          await deleteDoc(doc(db, "students", s.id));
          setStudents(prev => prev.filter(x => x.id !== s.id));
          showPopup("Deleted", `${s.name} moved to Recently Deleted.`, "success");
        } catch (err) {
          showPopup("Error", "Failed to delete student", "error");
        }
      }
    );
  };

  // Archive — sets active: false
  const archiveStudent = (s) => {
    showPopup(
      "Archive Student",
      `Archive ${s.name}? They will be hidden from attendance and reports, but not deleted.`,
      "confirm",
      async () => {
        closePopup();
        try {
          await updateDoc(doc(db, "students", s.id), { active: false });
          setStudents(prev => prev.filter(x => x.id !== s.id));
          showPopup("Archived", `${s.name} has been archived.`, "success");
        } catch (err) {
          showPopup("Error", "Failed to archive student", "error");
        }
      }
    );
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "teacher"]}>
        <NavBar />
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}

        {editModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="auth-card auth-glass p-6 rounded-2xl w-96 mx-4">
              <h2 className="text-lg font-semibold mb-4">Edit Student</h2>
              <label className="auth-label">Name</label>
              <input
                className="auth-input mb-3"
                value={editModal.name}
                onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
              />
              <label className="auth-label">Student ID</label>
              <input
                className="auth-input mb-3 font-mono"
                value={editModal.studentId}
                readOnly
                disabled
                style={{ backgroundColor: "rgba(226,232,240,0.5)", cursor: "not-allowed" }}
              />
              <label className="auth-label">Year</label>
              <select
                className="auth-input mb-3"
                value={editModal.year}
                onChange={(e) => setEditModal({ ...editModal, year: e.target.value, grade: "" })}
              >
                <option value="">-- Select Year --</option>
                {[...new Set(grades.map(g => g.Year))].sort((a, b) => a - b).map(year => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
              <label className="auth-label">Class</label>
              <select
                className="auth-input mb-4"
                value={editModal.grade}
                onChange={(e) => setEditModal({ ...editModal, grade: e.target.value })}
                disabled={!editModal.year}
              >
                <option value="">-- Select Class --</option>
                {grades
                  .filter(g => String(g.Year) === String(editModal.year))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                }
              </select>
              <div className="flex justify-end gap-3">
                <button
                  className="auth-btn auth-btn-small-alt"
                  onClick={() => setEditModal({ ...editModal, open: false })}
                >
                  Cancel
                </button>
                <button className="auth-btn auth-btn-primary" onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Student List</h1>
              <p className="text-sm text-slate-500">{students.length} active students</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push("/students/archived")}
                className="auth-btn auth-btn-small-alt flex items-center gap-1 text-xs"
              >
                <Archive size={13} /> Archived
              </button>
              <button
                onClick={() => router.push("/students/deleted")}
                className="auth-btn auth-btn-small-alt flex items-center gap-1 text-xs"
              >
                <Clock size={13} /> Recently Deleted
              </button>
            </div>
          </div>

          <div className="auth-glass rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 w-fit rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-semibold">{students.length}</div>
                  <div className="text-sm text-slate-500">Active Students</div>
                </div>
              </div>
              <button
                onClick={() => router.push("/attendance/addStudent")}
                className="auth-btn auth-btn-primary flex items-center gap-2 px-4"
              >
                <UserPlus size={16} /> Add Student
              </button>
            </div>
          </div>

          {loading && (
            <div className="auth-glass rounded-xl p-8 text-center">Loading...</div>
          )}

          {!loading && students.length === 0 && (
            <div className="auth-glass rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-slate-500 mb-4">No active students</p>
              <button
                onClick={() => router.push("/attendance/addStudent")}
                className="auth-btn auth-btn-primary flex items-center gap-2 px-4"
              >
                <UserPlus size={16} /> Add First Student
              </button>
            </div>
          )}

          {!loading &&
            Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(year => (
              <div key={year} className="space-y-4">
                <h2 className="text-lg font-semibold px-2">Year {year}</h2>
                {Object.keys(grouped[year]).sort((a, b) => a.localeCompare(b)).map(gradeName => (
                  <div key={gradeName} className="auth-glass rounded-xl p-4">
                    <div className="font-semibold mb-3 flex items-center justify-between">
                      <span>{gradeName}</span>
                      <span className="text-sm font-normal text-slate-500">
                        {grouped[year][gradeName].length} students
                      </span>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg border bg-white/70">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr className="text-slate-600 text-left">
                            <th className="py-2 px-4">#</th>
                            <th className="py-2 px-4">ID</th>
                            <th className="py-2 px-4">Name</th>
                            <th className="py-2 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grouped[year][gradeName].map((s, i) => (
                            <tr key={s.id} className="border-t hover:bg-slate-50 transition">
                              <td className="py-2 px-4 text-slate-500">{i + 1}</td>
                              <td className="py-2 px-4 font-mono font-bold text-purple-600">{s.studentId}</td>
                              <td className="py-2 px-4 font-medium">{s.name}</td>
                              <td className="py-2 px-4 text-right flex justify-end gap-3 items-center">
                                <button
                                  className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1"
                                  onClick={() => openEditModal(s)}
                                >
                                  <Edit size={12} /> Edit
                                </button>
                                <button
                                  className="text-amber-600 hover:underline text-xs inline-flex items-center gap-1"
                                  onClick={() => archiveStudent(s)}
                                >
                                  <Archive size={12} /> Archive
                                </button>
                                <button
                                  className="text-red-600 hover:underline text-xs inline-flex items-center gap-1"
                                  onClick={() => deleteStudent(s)}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-2">
                      {grouped[year][gradeName].map((s, i) => (
                        <div key={s.id} className="rounded-lg bg-white border p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold">{s.name}</div>
                              <div className="text-sm font-mono font-bold text-purple-600">{s.studentId}</div>
                            </div>
                            <span className="text-xs text-slate-400">#{i + 1}</span>
                          </div>
                          <div className="mt-3 flex gap-2 flex-wrap">
                            <button
                              className="px-3 py-1 bg-slate-100 rounded text-xs flex items-center gap-1"
                              onClick={() => openEditModal(s)}
                            >
                              <Edit size={12} /> Edit
                            </button>
                            <button
                              className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs flex items-center gap-1"
                              onClick={() => archiveStudent(s)}
                            >
                              <Archive size={12} /> Archive
                            </button>
                            <button
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs flex items-center gap-1"
                              onClick={() => deleteStudent(s)}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          }

          {!loading && students.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/attendance" className="auth-glass rounded-xl p-4">📱 Scan Attendance</Link>
              <Link href="/attendance/view" className="auth-glass rounded-xl p-4">📊 View Attendance</Link>
              <Link href="/attendance/generateqr" className="auth-glass rounded-xl p-4">🔳 Generate QR</Link>
              <Link href="/attendance/addStudent" className="auth-glass rounded-xl p-4">➕ Add Student</Link>
            </div>
          )}
        </div>
      </RoleProtected>
    </Protected>
  );
}