"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../components/Protected";
import RoleProtected from "../../components/RoleProtected";
import NavBar from "../../components/NavBar";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc } from "firebase/firestore";

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg ${type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
      <span className="text-xl">{type === "success" ? "✓" : "✕"}</span>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">✕</button>
    </div>
  );
}

function PopupModal({ title, message, onClose, onConfirm, showConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="auth-card auth-glass auth-popup rounded-2xl w-[420px] max-w-[90vw]">
        <div className="bg-purple-600 px-6 py-4 rounded-t-2xl">
          <h3 className="text-white text-center font-semibold">{title}</h3>
        </div>
        <div className="px-6 py-6 text-center text-sm text-slate-700">{message}</div>
        <div className="px-6 pb-6 flex justify-center gap-4">
          {showConfirm ? (
            <>
              <button onClick={onClose} className="auth-btn-small auth-btn-small-alt">Cancel</button>
              <button onClick={onConfirm} className="auth-btn auth-btn-primary" style={{ width: "160px" }}>Confirm</button>
            </>
          ) : (
            <button onClick={onClose} className="auth-btn auth-btn-purple" style={{ width: "160px" }}>OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner({ size = "md" }) {
  const s = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  return <div className={`${s} animate-spin rounded-full border-2 border-current border-t-transparent`} />;
}

export default function CanteenPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [grades, setGrades] = useState([]);
  const [gradeId, setGradeId] = useState("");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState(null);
  const [popup, setPopup] = useState(null);

  const showToast = (message, type = "success") => setToast({ message, type });
  const showPopup = (title, message, type = "info", onConfirm = null) =>
    setPopup({ title, message, type, onConfirm, showConfirm: !!onConfirm });
  const closePopup = () => setPopup(null);

  const dayString = useMemo(() => {
    const now = new Date();
    const localDate = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return localDate.toISOString().slice(0, 10);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const gradesSnap = await getDocs(collection(db, "grades"));
      const gradesMap = {};
      gradesSnap.docs.forEach(d => { gradesMap[d.id] = { id: d.id, ...d.data() }; });
      setGrades(Object.values(gradesMap).sort((a, b) => a.Year - b.Year || a.name.localeCompare(b.name)));

      // Load present students today
      const attendanceSnap = await getDocs(query(
        collection(db, "attendance"),
        where("present", "==", true),
        where("day", "==", dayString)
      ));
      const studentIds = attendanceSnap.docs.map(d => d.data().student);
      if (studentIds.length === 0) { setRows([]); setLoading(false); return; }

      // Load students — filter active only
      const studentsSnap = await getDocs(collection(db, "students"));
      const studentsMap = {};
      studentsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.active !== false) {          // <-- active filter
          studentsMap[d.id] = { id: d.id, ...data };
        }
      });

      // Load canteen records for today
      const canteenSnap = await getDocs(
        query(collection(db, "canteen"), where("day", "==", dayString))
      );
      const canteenMap = {};
      canteenSnap.docs.forEach(d => {
        const data = d.data();
        if (!canteenMap[data.student]) canteenMap[data.student] = { id: d.id, ...data };
      });

      let mapped = studentIds
        .map(id => studentsMap[id])
        .filter(Boolean)                      // drops inactive students
        .map(s => {
          const grade = gradesMap[s.grade] || null;
          return {
            id: s.id, studentId: s.studentId, name: s.name,
            gradeId: s.grade, gradeName: grade?.name || "-", gradeYear: grade?.Year || "-",
            canteen: canteenMap[s.id] || null
          };
        })
        .sort((a, b) => {
          const y = (a.gradeYear || 0) - (b.gradeYear || 0);
          if (y !== 0) return y;
          const g = a.gradeName.localeCompare(b.gradeName);
          if (g !== 0) return g;
          return a.name.localeCompare(b.name);
        });

      setRows(mapped);
    } catch (err) {
      console.error("Failed to load canteen data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [dayString]);

  const handleLunchChange = async (studentId, value) => {
    const checked = value === "yes";
    setRows(prev => prev.map(r =>
      r.id === studentId ? { ...r, canteen: { ...r.canteen, lunchReceived: checked } } : r
    ));
    try {
      const row = rows.find(r => r.id === studentId);
      const existing = row?.canteen?.id ? row.canteen : null;
      let savedRecord;
      if (existing?.id) {
        await updateDoc(doc(db, "canteen", existing.id), { lunchReceived: checked });
        savedRecord = { ...existing, lunchReceived: checked };
      } else {
        const ref = await addDoc(collection(db, "canteen"), {
          student: studentId, day: dayString,
          date: new Date().toISOString(), lunchReceived: checked
        });
        savedRecord = { id: ref.id, student: studentId, day: dayString, lunchReceived: checked };
      }
      setRows(prev => prev.map(r => r.id === studentId ? { ...r, canteen: savedRecord } : r));
    } catch (err) {
      console.error("Failed to save lunch status:", err);
      setTimeout(() => load(), 500);
    }
  };

  const selectAllLunch = () => {
    showPopup("Select All", "Mark ALL present students as having received lunch?", "confirm", async () => {
      closePopup();
      setBulkProcessing(true);
      try {
        const updates = filtered.map(async r => {
          if (r.canteen?.id) {
            await updateDoc(doc(db, "canteen", r.canteen.id), { lunchReceived: true });
            return { id: r.id, canteen: { ...r.canteen, lunchReceived: true } };
          } else {
            const ref = await addDoc(collection(db, "canteen"), {
              student: r.id, day: dayString,
              date: new Date().toISOString(), lunchReceived: true
            });
            return { id: r.id, canteen: { id: ref.id, student: r.id, day: dayString, lunchReceived: true } };
          }
        });
        const results = await Promise.all(updates);
        setRows(prev => prev.map(r => {
          const updated = results.find(u => u.id === r.id);
          return updated ? { ...r, canteen: updated.canteen } : r;
        }));
        showPopup("Success", `All ${filtered.length} students marked as lunch received.`, "success");
      } catch (err) {
        showPopup("Error", "Failed to update all students.", "error");
      } finally {
        setBulkProcessing(false);
      }
    });
  };

  const handlePrint = () => {
    const today = new Date().toLocaleDateString('ms-MY');
    const tableRows = filtered.map((r, i) =>
      `<tr><td style="border:1px solid #ddd;padding:8px;text-align:center">${i + 1}</td><td style="border:1px solid #ddd;padding:8px">${r.studentId}</td><td style="border:1px solid #ddd;padding:8px">${r.name}</td><td style="border:1px solid #ddd;padding:8px;text-align:center">${r.gradeYear}</td><td style="border:1px solid #ddd;padding:8px">${r.gradeName}</td><td style="border:1px solid #ddd;padding:8px;text-align:center">${r.canteen?.lunchReceived ? '✓' : ''}</td></tr>`
    ).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Canteen - ${today}</title><style>@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;border:1px solid #ddd;padding:10px 8px;text-align:left;font-size:12px}td{font-size:11px}</style></head><body><h2>REKOD PENGAMBILAN MAKANAN MURID - ${today}</h2><table><thead><tr><th>BIL</th><th>ID</th><th>NAMA</th><th>TAHUN</th><th>KELAS</th><th>DITERIMA</th></tr></thead><tbody>${tableRows}</tbody></table><p>Jumlah Hadir: ${filtered.length} | Diterima: ${filtered.filter(r => r.canteen?.lunchReceived).length}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const filtered = rows.filter(r => {
    const passGrade = !gradeId || r.gradeId === gradeId;
    const passQ = !q || `${r.name} ${r.studentId}`.toLowerCase().includes(q.toLowerCase());
    return passGrade && passQ;
  });

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "canteen"]}>
        <NavBar />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}

        <div className="auth-card auth-glass p-4 sm:p-6 space-y-4">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div>
              <h1 className="auth-welcome">Canteen Operator</h1>
              <p className="text-sm text-slate-500">Daily meal distribution · Today</p>
            </div>
            <button
              onClick={() => showPopup("Send to Invoice", "Send meal order data to invoice?", "confirm",
                () => { closePopup(); router.push("/borang/invoice"); })}
              className="auth-btn-small auth-btn-primary"
            >
              Meal Order
            </button>
            <button onClick={handlePrint} className="btn-outline">Print Report</button>
            <select className="input max-w-[14rem]" value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
              <option value="">Semua Kelas</option>
              {grades.map(g => <option key={g.id} value={g.id}>Tahun {g.Year} - {g.name}</option>)}
            </select>
            <button
              className="auth-btn-small auth-btn-primary"
              onClick={selectAllLunch}
              disabled={bulkProcessing || loading || filtered.length === 0}
            >
              {bulkProcessing ? <><Spinner size="sm" /> Processing...</> : "Select All"}
            </button>
            <input
              className="input max-w-xs"
              placeholder="Search name or ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {loading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

          {!loading && (
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pr-4">NUMBER</th>
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-4 px-4">NAMA</th>
                    <th className="py-2 pr-4">TAHUN</th>
                    <th className="py-2 pr-4">KELAS</th>
                    <th className="py-2 pr-4 text-center">LUNCH RECEIVED</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} className="border-t">
                      <td className="py-2 pr-4">{i + 1}</td>
                      <td className="py-2 pr-4">{r.studentId}</td>
                      <td className="py-4 px-4">{r.name}</td>
                      <td className="py-2 pr-4">{r.gradeYear}</td>
                      <td className="py-2 pr-4">{r.gradeName}</td>
                      <td className="py-2 pr-4">
                        <div className="flex justify-center">
                          <select
                            className="input py-1 px-2 text-sm"
                            style={{ minWidth: '100px' }}
                            value={r.canteen?.lunchReceived ? "yes" : "no"}
                            onChange={(e) => handleLunchChange(r.id, e.target.value)}
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && (
            <div className="md:hidden space-y-3">
              {filtered.map((r, i) => (
                <div key={r.id} className="auth-card auth-glass p-4 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.studentId} · Year {r.gradeYear} · {r.gradeName}</p>
                    </div>
                    <span className="text-xs text-slate-400">#{i + 1}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <select
                      className="input py-1 px-2 text-sm"
                      style={{ minWidth: '120px' }}
                      value={r.canteen?.lunchReceived ? "yes" : "no"}
                      onChange={(e) => handleLunchChange(r.id, e.target.value)}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    <span className="text-sm">Lunch received</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </RoleProtected>
    </Protected>
  );
}