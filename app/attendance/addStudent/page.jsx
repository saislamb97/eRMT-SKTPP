"use client";
import "../../special.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../../components/Protected";
import RoleProtected from "../../../components/RoleProtected";
import NavBar from "../../../components/NavBar";
import { db } from "../../../lib/firebase";
import {
  collection, getDocs, addDoc, query, orderBy, serverTimestamp
} from "firebase/firestore";

const PREFIX = "RMT";
const PAD_LENGTH = 3;

function formatStudentId(value) {
  return `${PREFIX}${String(value).padStart(PAD_LENGTH, "0")}`;
}

export default function AddStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [nextIdPreview, setNextIdPreview] = useState("RMT001");
  const [classes, setClasses] = useState([]);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassYear, setNewClassYear] = useState("");
  const [formData, setFormData] = useState({ name: "", year: "", grade: "" });

  const loadClasses = async () => {
    try {
      const snap = await getDocs(query(collection(db, "grades"), orderBy("Year")));
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const loadNextId = async () => {
    try {
      const snap = await getDocs(collection(db, "students"));
      setNextIdPreview(formatStudentId(snap.size + 1));
    } catch {
      setNextIdPreview("RMT001");
    }
  };

  useEffect(() => {
    loadClasses();
    loadNextId();
  }, []);

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      setError("Please enter a class name");
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (!newClassYear) {
      setError("Please select a year");
      setTimeout(() => setError(""), 3000);
      return;
    }
    try {
      const ref = await addDoc(collection(db, "grades"), {
        name: newClassName.toUpperCase().trim(),
        Year: parseInt(newClassYear),
      });
      await loadClasses();
      setFormData({ ...formData, grade: ref.id, year: newClassYear });
      setNewClassName("");
      setNewClassYear("");
      setShowCreateClass(false);
      setSuccess(`Class "${newClassName.toUpperCase()}" created!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to create class");
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "students"));
      const studentId = formatStudentId(snap.size + 1);
      await addDoc(collection(db, "students"), {
        name: formData.name,
        grade: formData.grade,
        studentId,
        active: true,           // <-- Feature 2: active flag
        createdAt: serverTimestamp(), // <-- good to have
      });
      setSuccess(`✅ Student added! ID: ${studentId}`);
      await loadNextId();
      setFormData({ name: "", year: formData.year, grade: "" });
    } catch (err) {
      setError(err.message || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "teacher"]}>
        <NavBar />
        <div className="min-h-screen py-6 px-4">
          <div className="max-w-xl mx-auto fade-in">
            <div className="auth-card auth-glass p-6 sm:p-8">
              <div className="mb-6 text-center">
                <h1 className="auth-title">Add New Student</h1>
                <p className="text-sm opacity-60 mt-1">Register a new student in the system</p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="auth-label">Student Name</label>
                  <input
                    type="text"
                    className="auth-input"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Full name (as in IC)"
                  />
                </div>

                <div>
                  <label className="auth-label">Year</label>
                  <select
                    className="auth-input"
                    value={formData.year}
                    onChange={(e) => {
                      handleChange("year", e.target.value);
                      handleChange("grade", "");
                    }}
                  >
                    <option value="">-- Select Year --</option>
                    {[1, 2, 3, 4, 5, 6].map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="auth-label">Class</label>
                  <select
                    className="auth-input"
                    value={formData.grade}
                    onChange={(e) => handleChange("grade", e.target.value)}
                    disabled={!formData.year}
                  >
                    <option value="">-- Select Class --</option>
                    {classes
                      .filter((c) => String(c.Year) === String(formData.year))
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))
                    }
                  </select>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateClass(!showCreateClass)}
                      style={{ width: "200px" }}
                      className="auth-btn auth-btn-small-alt w-full"
                    >
                      {showCreateClass ? "Cancel" : "➕ Create New Class"}
                    </button>
                  </div>

                  {showCreateClass && (
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                      <div>
                        <label className="auth-label text-sm">Year for New Class</label>
                        <select
                          className="auth-input"
                          value={newClassYear}
                          onChange={(e) => setNewClassYear(e.target.value)}
                        >
                          <option value="">-- Select Year --</option>
                          {[1, 2, 3, 4, 5, 6].map(y => (
                            <option key={y} value={y}>Year {y}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="auth-label text-sm">New Class Name</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="auth-input flex-1"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value.toUpperCase())}
                            placeholder="e.g. AMBER, SAPPHIRE"
                          />
                          <button
                            type="button"
                            onClick={handleCreateClass}
                            style={{ width: "150px" }}
                            className="auth-btn auth-btn-primary"
                          >
                            Create
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="auth-popup p-4" style={{ height: "auto" }}>
                  <label className="auth-label" style={{ color: "#7c3aed" }}>Next Student ID</label>
                  <div className="text-3xl font-mono font-bold text-purple-600 text-center mt-2">
                    {nextIdPreview}
                  </div>
                  <p className="text-xs opacity-60 mt-3 text-center">
                    Global sequential ID • Format: RMT001, RMT002...
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => router.push("/attendance/view")}
                    className="auth-btn auth-btn-small-alt flex-1"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="auth-btn auth-btn-primary flex-1"
                    disabled={loading || !formData.name || !formData.year || !formData.grade}
                  >
                    {loading ? "Adding..." : "Add Student"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}