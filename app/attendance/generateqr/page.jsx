"use client";
import "../../special.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../../components/Protected";
import RoleProtected from "../../../components/RoleProtected";
import NavBar from "../../../components/NavBar";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";

export default function GenerateQRPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const gradesSnap = await getDocs(query(collection(db, "grades"), orderBy("name")));
        const gradeList = gradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const studentsSnap = await getDocs(query(collection(db, "students"), orderBy("studentId")));
        const studentList = studentsSnap.docs
          .map(d => {
            const data = d.data();
            const grade = gradeList.find(g => g.id === data.grade);
            return { id: d.id, ...data, gradeData: grade || null };
          })
          .filter(s => s.active !== false); // active students only

        setGrades(gradeList);
        setStudents(studentList);
      } catch (e) {
        setError(e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredStudents = selectedGrade === "ALL"
    ? students
    : students.filter(s => s.grade === selectedGrade);

  const downloadQR = (canvasId, filename) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = filename;
    link.click();
  };

  const printQRCards = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const rows = filteredStudents.map(s => {
      const canvas = document.getElementById(`qr-${s.id}`);
      if (!canvas) return "";
      const dataUrl = canvas.toDataURL("image/png");
      return `<div class="card"><img src="${dataUrl}" /><div class="name">${s.name}</div><div class="grade">Year ${s.gradeData?.Year || ""} - ${s.gradeData?.name || ""}</div><div class="id">${s.studentId}</div></div>`;
    }).join("");

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<html><head><title>Student QR Codes</title><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10mm}.card{text-align:center;page-break-inside:avoid;padding:5mm;border:1px solid #eee;border-radius:8px}img{width:40mm;height:40mm;display:block;margin:0 auto}.name{font-size:9pt;font-weight:bold;margin-top:8px}.grade{font-size:8pt;color:#666}.id{font-size:10pt;font-weight:bold;margin-top:4px;color:#7c3aed}</style></head><body><div class="grid">${rows}</div><script>window.onload=()=>window.print()<\/script></body></html>`);
    printWindow.document.close();
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "teacher"]}>
        <NavBar />
        <div className="min-h-screen py-6 px-4">
          <div className="max-w-7xl mx-auto fade-in">
            <div className="auth-card auth-glass p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="auth-title">Generate Student QR Codes</h1>
                  <p className="text-sm opacity-60 mt-1">{filteredStudents.length} students</p>
                </div>
                <button onClick={() => router.push("/attendance/view")} className="auth-btn auth-btn-small-alt">← Back</button>
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                <select
                  className="auth-input"
                  style={{ maxWidth: '250px' }}
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                >
                  <option value="ALL">All Classes</option>
                  {[...new Set(grades.map(g => g.Year))].sort((a, b) => a - b).map(year => (
                    <optgroup key={year} label={`Year ${year}`}>
                      {grades.filter(g => g.Year === year).sort((a, b) => a.name.localeCompare(b.name)).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  className="auth-btn auth-btn-primary"
                  onClick={printQRCards}
                  disabled={filteredStudents.length === 0}
                >
                  🖨️ Print All (A4)
                </button>
              </div>

              {loading && <div className="text-center py-12">Loading...</div>}
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
              )}
              {!loading && filteredStudents.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🏷️</div>
                  <p className="text-slate-500 mb-4">No students to generate QR codes</p>
                  <button
                    onClick={() => router.push("/attendance/addStudent")}
                    className="auth-btn auth-btn-primary"
                  >
                    ➕ Add Student
                  </button>
                </div>
              )}

              {!loading && filteredStudents.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredStudents.map(student => (
                    <div
                      key={student.id}
                      className="bg-white rounded-xl p-4 border shadow-sm text-center hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-center mb-3">
                        <QRCodeCanvas id={`qr-${student.id}`} value={student.studentId} size={140} level="H" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold text-sm truncate">{student.name}</div>
                        <div className="text-xs text-slate-500">
                          Year {student.gradeData?.Year} - {student.gradeData?.name}
                        </div>
                        <div className="text-sm font-mono font-bold text-purple-600">{student.studentId}</div>
                      </div>
                      <button
                        className="mt-3 w-full auth-btn auth-btn-small-alt text-xs py-2"
                        type="button"
                        onClick={() => downloadQR(`qr-${student.id}`, `${student.studentId}.png`)}
                      >
                        ⬇️ Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}