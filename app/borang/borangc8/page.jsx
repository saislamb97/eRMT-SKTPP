"use client";
import "../../special.css";
import { useState, useEffect } from "react";
import Protected from "../../../components/Protected";
import RoleProtected from "../../../components/RoleProtected";
import NavBar from "../../../components/NavBar";
import TeacherSelect from "../../../components/TeacherSelect";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

export default function BorangC8Page() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attendanceData, setAttendanceData] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    schoolName: 'SEKOLAH KEBANGSAAN TAMAN PUTRA PERDANA',
    guruKelasId: null, guruKelas: '',
    guruBesarId: null, guruBesar: '',
    tarikhGuru: new Date().toISOString().slice(0, 10),
    tarikhBesar: new Date().toISOString().slice(0, 10),
  });

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();

  const handleGenerate = async () => {
    setError(""); setLoading(true); setAttendanceData(null);
    try {
      const { year, month } = formData;
      const daysInMonth = getDaysInMonth(month, year);

      // SAFE pattern — fetch all, then filter active in JS (avoids composite index requirement)
      const studentsSnap = await getDocs(query(collection(db, "students"), orderBy("name")));
      const students = studentsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.active !== false);

      const gradesSnap = await getDocs(collection(db, "grades"));
      const gradesMap = {};
      gradesSnap.docs.forEach(d => { gradesMap[d.id] = d.data(); });

      // Load all attendance for the month
      const attendanceRecords = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dayString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const snap = await getDocs(query(collection(db, "attendance"), where("day", "==", dayString)));
        snap.docs.forEach(d => attendanceRecords.push({ id: d.id, ...d.data() }));
      }

      const attendanceMatrix = {};
      students.forEach(s => {
        attendanceMatrix[s.id] = {
          name: s.name,
          class: gradesMap[s.grade]?.name || "-",
          days: Array(daysInMonth).fill(null)
        };
      });

      attendanceRecords.forEach(record => {
        const dayString = record.day;
        if (dayString && attendanceMatrix[record.student]) {
          const day = parseInt(dayString.split('-')[2]) - 1;
          if (day >= 0 && day < daysInMonth && record.present === true) {
            attendanceMatrix[record.student].days[day] = "O";
          }
        }
      });

      const studentsWithTotals = Object.entries(attendanceMatrix).map(([id, data]) => {
        const present = data.days.filter(d => d === "O").length;
        const absent = data.days.filter(d => d === null).length;
        return { id, name: data.name, class: data.class, days: data.days, present, absent, total: present + absent };
      });

      setAttendanceData({ students: studentsWithTotals, daysInMonth, totalStudents: students.length, totalPresent: studentsWithTotals.reduce((sum, s) => sum + s.present, 0), totalAbsent: studentsWithTotals.reduce((sum, s) => sum + s.absent, 0) });
      setShowReport(true);
    } catch (err) {
      setError("Failed to generate report. " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  if (showReport && attendanceData) {
    return (
      <Protected>
        <RoleProtected allowedRoles={["admin", "teacher"]}>
          <style jsx global>{`@media print{@page{size:A4 landscape;margin:8mm}body{margin:0;padding:0;background:white}.no-print{display:none !important}.print-table th,.print-table td{border:1px solid black !important;padding:1px 2px;font-size:7pt;line-height:1.2}.print-table th{background-color:#e5e7eb !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-weight:bold}}`}</style>
          <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
            <button onClick={() => setShowReport(false)} className="btn-outline bg-white shadow-lg">← Back</button>
            <button onClick={() => window.print()} className="btn bg-white shadow-lg">🖨️ Print</button>
          </div>
          <div className="min-h-screen bg-white p-2 sm:p-8">
            <div className="text-right text-xs font-semibold mb-1">BORANG C8</div>
            <h1 className="text-lg sm:text-2xl font-bold text-center mb-1">RMT STUDENT ATTENDANCE RECORD</h1>
            <div className="text-sm sm:text-lg font-semibold text-center">{formData.schoolName}</div>
            <div className="text-xs sm:text-base font-medium text-center mt-1">MONTH: {monthNames[formData.month-1].toUpperCase()} {formData.year}</div>
            <div className="overflow-x-auto mt-4">
              <table className="print-table w-full border-collapse border-2 border-black text-xs">
                <thead>
                  <tr>
                    <th className="border-2 border-black p-1" rowSpan="2">NO</th>
                    <th className="border-2 border-black p-1" rowSpan="2" style={{ minWidth: '120px' }}>NAME</th>
                    <th className="border-2 border-black p-1" rowSpan="2">CLASS</th>
                    <th className="border-2 border-black p-1 text-center" colSpan={attendanceData.daysInMonth}>MONTH: {monthNames[formData.month-1].toUpperCase()}</th>
                    <th className="border-2 border-black p-1" rowSpan="2">TOTAL<br/>PRESENT</th>
                    <th className="border-2 border-black p-1 text-center" colSpan="2">ABSENT</th>
                  </tr>
                  <tr>
                    {Array.from({ length: attendanceData.daysInMonth }, (_, i) => <th key={i} className="border border-black p-1 text-center" style={{ minWidth: '18px', fontSize: '7pt' }}>{i+1}</th>)}
                    <th className="border-2 border-black p-1" style={{ fontSize: '7pt' }}>CURRENT<br/>MONTH</th>
                    <th className="border-2 border-black p-1" style={{ fontSize: '7pt' }}>PREVIOUS<br/>MONTH</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.students.map((student, idx) => (
                    <tr key={student.id}>
                      <td className="border border-black p-1 text-center">{idx+1}</td>
                      <td className="border border-black p-1">{student.name}</td>
                      <td className="border border-black p-1 text-center">{student.class}</td>
                      {student.days.map((status, dayIdx) => <td key={dayIdx} className="border border-black p-0 text-center font-bold" style={{ fontSize: '8pt' }}>{status === "O" ? "O" : ""}</td>)}
                      <td className="border border-black p-1 text-center font-bold">{student.present}</td>
                      <td className="border border-black p-1 text-center">{student.absent}</td>
                      <td className="border border-black p-1 text-center">-</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border-2 border-black p-1 font-bold" colSpan="3">TOTAL STUDENTS ABSENT</td>
                    {Array.from({ length: attendanceData.daysInMonth }, (_, i) => { const n = attendanceData.students.filter(s => s.days[i] === null).length; return <td key={i} className="border border-black p-0 text-center font-semibold" style={{ fontSize: '8pt' }}>{n > 0 ? n : ""}</td>; })}
                    <td className="border-2 border-black p-1" colSpan="3"></td>
                  </tr>
                  <tr>
                    <td className="border-2 border-black p-1 font-bold" colSpan="3">TOTAL STUDENTS PRESENT</td>
                    {Array.from({ length: attendanceData.daysInMonth }, (_, i) => { const n = attendanceData.students.filter(s => s.days[i] === "O").length; return <td key={i} className="border border-black p-0 text-center font-semibold" style={{ fontSize: '8pt' }}>{n > 0 ? n : ""}</td>; })}
                    <td className="border-2 border-black p-1" colSpan="3"></td>
                  </tr>
                  <tr>
                    <td className="border-2 border-black p-1 font-bold" colSpan="3">EXPECTED TOTAL ATTENDANCE</td>
                    {Array.from({ length: attendanceData.daysInMonth }, (_, i) => <td key={i} className="border border-black p-0 text-center font-semibold" style={{ fontSize: '8pt' }}>{attendanceData.students.length}</td>)}
                    <td className="border-2 border-black p-1" colSpan="3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-8 text-xs sm:text-sm">
              <div><div className="mb-12"></div><div className="border-t-2 border-black pt-2"><p className="font-semibold">Class Teacher</p><p className="mt-1">Name: {formData.guruKelas || '_________________'}</p><p>Date: {formData.tarikhGuru || '_________________'}</p></div></div>
              <div><div className="mb-12"></div><div className="border-t-2 border-black pt-2"><p className="font-semibold">Headmaster / Principal</p><p className="mt-1">Name: {formData.guruBesar || '_________________'}</p><p>Date: {formData.tarikhBesar || '_________________'}</p></div></div>
            </div>
          </div>
        </RoleProtected>
      </Protected>
    );
  }

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "teacher"]}>
        <NavBar />
        <div className="min-h-screen pb-16 px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="auth-card auth-glass p-6 sm:p-8 space-y-8 mb-12">
              <h1 className="auth-title mb-6">Generate Borang C8</h1>
              <div className="mb-6">
                <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">School Information</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-3"><label className="auth-label">School Name</label><input type="text" className="auth-input" value={formData.schoolName} onChange={(e) => handleChange('schoolName', e.target.value)} /></div>
                  <div><label className="auth-label">Month</label><select className="auth-input" value={formData.month} onChange={(e) => handleChange('month', parseInt(e.target.value))}>{monthNames.map((name, idx) => <option key={idx} value={idx+1}>{name}</option>)}</select></div>
                  <div><label className="auth-label">Year</label><input type="number" className="auth-input" value={formData.year} onChange={(e) => handleChange('year', parseInt(e.target.value))} min="2020" max="2030" /></div>
                </div>
              </div>
              <div className="mb-6 pb-6 border-b border-white/30">
                <h2 className="text-sm font-semibold mb-3">Class Teacher Information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TeacherSelect value={formData.guruKelasId} nameValue={formData.guruKelas} onChange={(id) => handleChange('guruKelasId', id)} onNameChange={(name) => handleChange('guruKelas', name)} label="Name" required useAuthStyle={true} />
                  <div><label className="auth-label">Date</label><input type="date" className="auth-input" value={formData.tarikhGuru} onChange={(e) => handleChange('tarikhGuru', e.target.value)} /></div>
                </div>
              </div>
              <div className="mb-6">
                <h2 className="text-sm font-semibold mb-3">Principal Information</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TeacherSelect value={formData.guruBesarId} nameValue={formData.guruBesar} onChange={(id) => handleChange('guruBesarId', id)} onNameChange={(name) => handleChange('guruBesar', name)} label="Name" required useAuthStyle={true} />
                  <div><label className="auth-label">Date</label><input type="date" className="auth-input" value={formData.tarikhBesar} onChange={(e) => handleChange('tarikhBesar', e.target.value)} /></div>
                </div>
              </div>
              <button onClick={handleGenerate} className="auth-btn auth-btn-primary w-full" disabled={loading}>{loading ? "Generating..." : "Generate Report"}</button>
              {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}