"use client";
import "../../../special.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../../../components/Protected";
import RoleProtected from "../../../../components/RoleProtected";
import NavBar from "../../../../components/NavBar";
import { db } from "../../../../lib/firebase";
import { collection, getDocs, query, orderBy, doc, deleteDoc } from "firebase/firestore";

function PopupModal({ title, message, type, onClose, onConfirm, showConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className={`px-6 py-4 ${type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : type === "confirm" ? "bg-blue-500" : "bg-amber-500"}`}>
          <div className="flex items-center gap-3 text-white">
            <span className="text-2xl">{type === "success" ? "✓" : type === "error" ? "✕" : type === "confirm" ? "?" : "⚠"}</span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        </div>
        <div className="px-6 py-5"><p className="text-slate-700">{message}</p></div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          {showConfirm ? (
            <><button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100">Batal</button><button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Sahkan</button></>
          ) : (
            <button onClick={onClose} className={`px-4 py-2 rounded-lg text-white ${type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-blue-600"}`}>OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BorangC6ViewPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  const showPopup = (title, message, type = "info", onConfirm = null) => setPopup({ title, message, type, onConfirm, showConfirm: !!onConfirm });
  const closePopup = () => setPopup(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "borang_c6"), orderBy("orderDate", "desc")));
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load Borang C6:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const handleDelete = (record) => {
    showPopup("Sahkan Padam", `Padam Borang C6 ${record.orderNumber}?`, "confirm", async () => {
      closePopup();
      try {
        await deleteDoc(doc(db, "borang_c6", record.id));
        showPopup("Berjaya", "Borang C6 berjaya dipadam!", "success");
        loadRecords();
      } catch (err) {
        showPopup("Ralat", "Gagal memadam Borang C6", "error");
      }
    });
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "canteen"]}>
        <NavBar />
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}
        <div className="min-h-screen py-6 px-4">
          <div className="max-w-6xl mx-auto fade-in">
            <div className="auth-card auth-glass p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="auth-title">Senarai Borang C6</h1>
                  <p className="text-sm opacity-60">Semua borang pesanan harian</p>
                </div>
                <button onClick={() => router.push("/borang/borangc6")} className="auth-btn auth-btn-primary" style={{ width: 'auto', padding: '12px 24px' }}>+ Buat Borang Baru</button>
              </div>

              <div className="overflow-x-auto rounded-xl border bg-white/70">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left">No. Pesanan</th>
                      <th className="px-4 py-3 text-left">Tarikh</th>
                      <th className="px-4 py-3 text-center">Bil. Murid</th>
                      <th className="px-4 py-3 text-left">Dibuat Oleh</th>
                      <th className="px-4 py-3 text-left">Disahkan Oleh</th>
                      <th className="px-4 py-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={6} className="py-8 text-center">Memuatkan...</td></tr>}
                    {!loading && records.map((record, index) => (
                      <tr key={record.id} className="border-t hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-semibold text-blue-700">{record.orderNumber}</td>
                        <td className="px-4 py-3">{record.orderDate ? new Date(record.orderDate).toLocaleDateString("ms-MY") : "-"}</td>
                        <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-sm font-medium">{record.studentCount || 0}</span></td>
                        <td className="px-4 py-3"><div>{record.createdByName || "-"}</div><div className="text-xs text-slate-500">{record.createdByPosition}</div></td>
                        <td className="px-4 py-3"><div>{record.approvedByName || "-"}</div><div className="text-xs text-slate-500">{record.approvedByPosition}</div></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium" onClick={() => router.push(`/borang/borangc6/${record.id}`)}>👁️ Lihat</button>
                            <button className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm" onClick={() => handleDelete(record)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && records.length === 0 && (
                      <tr><td colSpan={6} className="py-12 text-center"><div className="text-slate-400 text-lg mb-2">📋</div><p className="text-slate-500">Tiada Borang C6.</p><button onClick={() => router.push("/borang/borangc6")} className="mt-4 text-blue-600 hover:underline text-sm">Buat Borang C6 Pertama →</button></td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">Jumlah: {records.length} rekod</p>
                <button onClick={() => router.back()} className="auth-btn auth-btn-small-alt" style={{ width: 'auto' }}>← Kembali</button>
              </div>
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}