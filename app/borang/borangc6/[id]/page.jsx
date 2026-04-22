"use client";
import "../../../special.css";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Protected from "../../../../components/Protected";
import RoleProtected from "../../../../components/RoleProtected";
import NavBar from "../../../../components/NavBar";
import { db } from "../../../../lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

function PopupModal({ title, message, type, onClose, onConfirm, showConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className={`px-6 py-4 ${type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : type === "confirm" ? "bg-blue-500" : "bg-amber-500"}`}>
          <div className="flex items-center gap-3 text-white">
            <span className="text-2xl">{type === "success" ? "✓" : type === "error" ? "✕" : "?"}</span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        </div>
        <div className="px-6 py-5"><p className="text-slate-700">{message}</p></div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          {showConfirm ? (
            <><button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600">Batal</button><button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Sahkan</button></>
          ) : (
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 text-white">OK</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BorangC6DetailPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = params.id;
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  const showPopup = (title, message, type = "info", onConfirm = null) => setPopup({ title, message, type, onConfirm, showConfirm: !!onConfirm });
  const closePopup = () => setPopup(null);

  useEffect(() => {
    const loadRecord = async () => {
      if (!recordId) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "borang_c6", recordId));
        if (snap.exists()) setRecord({ id: snap.id, ...snap.data() });
        else showPopup("Ralat", "Borang C6 tidak dijumpai", "error");
      } catch (err) {
        showPopup("Ralat", "Gagal memuatkan Borang C6", "error");
      } finally {
        setLoading(false);
      }
    };
    loadRecord();
  }, [recordId]);

  const handlePrint = () => {
    if (!record) return;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Borang C6 - ${record.orderNumber}</title><style>@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif;padding:20px;line-height:1.6}.header{display:flex;justify-content:space-between;border-bottom:2px solid black;padding-bottom:15px;margin-bottom:20px}.form-row{display:flex;align-items:baseline;margin-bottom:12px}.form-row label{min-width:200px;font-weight:600;font-size:13px}.form-row .value{border-bottom:1px dotted black;flex:1;min-height:22px;padding:0 8px;font-size:13px}.section-title{font-weight:bold;margin:30px 0 15px 0;font-size:13px;border-bottom:1px solid #ccc;padding-bottom:5px}.signature-section{margin:15px 0;padding-left:20px}.signature-row{display:flex;margin-bottom:10px}.signature-row label{min-width:80px;font-weight:600;font-size:13px}.signature-row .value{border-bottom:1px dotted black;flex:1;padding:0 8px;min-height:22px;font-size:13px}.footer-note{text-align:center;font-style:italic;margin-top:40px;font-size:11px;color:#666;border-top:1px solid #eee;padding-top:15px}</style></head><body><div class="header"><div><h1>PERJANJIAN RMT</h1><p style="font-size:12px;color:#666">Sekolah Kebangsaan Taman Putra Perdana</p></div><div style="border:2px solid black;padding:8px 15px;font-weight:bold">Borang C6</div></div><div style="text-align:center;margin-bottom:20px"><h2>BORANG PESANAN HARIAN</h2><p>BEKALAN MAKANAN RANCANGAN MAKANAN TAMBAHAN SEKOLAH</p></div><div style="text-align:right;margin-bottom:25px">NO: <strong>${record.orderNumber}</strong></div><div class="form-row"><label>Tarikh pesanan dibuat</label><span>:</span><div class="value">${record.orderDate ? new Date(record.orderDate).toLocaleDateString('ms-MY') : '-'}</div></div><div class="form-row"><label>Bil. murid yang makan</label><span>:</span><div class="value">${record.studentCount || 0}</div></div><div class="section-title">Pesanan dibuat oleh</div><div class="signature-section"><div class="signature-row"><label>Nama</label><span>:</span><div class="value">${record.createdByName || ''}</div></div><div class="signature-row"><label>Jawatan</label><span>:</span><div class="value">${record.createdByPosition || ''}</div></div></div><div class="section-title">Disahkan oleh</div><div class="signature-section"><div class="signature-row"><label>Nama</label><span>:</span><div class="value">${record.approvedByName || ''}</div></div><div class="signature-row"><label>Jawatan</label><span>:</span><div class="value">${record.approvedByPosition || ''}</div></div></div><div class="section-title">Diterima oleh pembekal</div><div class="signature-section"><div class="signature-row"><label>Nama</label><span>:</span><div class="value">${record.recievedByName || ''}</div></div><div class="signature-row"><label>Jawatan</label><span>:</span><div class="value">${record.recievedByPosition || ''}</div></div><div class="signature-row"><label>Tarikh</label><span>:</span><div class="value">${record.recievedDate || ''}</div></div></div><div class="footer-note">( Sila kepilkan salinan asal borang ini apabila membuat tuntutan bayaran )</div><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>`);
    printWindow.document.close();
  };

  const handleDelete = () => {
    showPopup("Sahkan Padam", `Padam Borang C6 ${record?.orderNumber}?`, "confirm", async () => {
      closePopup();
      try {
        await deleteDoc(doc(db, "borang_c6", recordId));
        showPopup("Berjaya", "Borang C6 berjaya dipadam!", "success");
        setTimeout(() => router.push("/borang/borangc6/view"), 1500);
      } catch (err) {
        showPopup("Ralat", "Gagal memadam Borang C6", "error");
      }
    });
  };

  if (loading) return <Protected><RoleProtected allowedRoles={["admin", "canteen"]}><NavBar /><div className="min-h-screen flex items-center justify-center"><div className="auth-card auth-glass p-8">Memuatkan...</div></div></RoleProtected></Protected>;

  if (!record) return (
    <Protected><RoleProtected allowedRoles={["admin", "canteen"]}><NavBar />
      {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}
      <div className="min-h-screen py-6 px-4"><div className="max-w-2xl mx-auto"><div className="auth-card auth-glass p-8 text-center"><div className="text-4xl mb-4">📋</div><h1 className="text-xl font-semibold">Borang C6 Tidak Dijumpai</h1><button onClick={() => router.push("/borang/borangc6/view")} className="auth-btn auth-btn-primary mt-6" style={{ width: 'auto', padding: '10px 20px' }}>← Kembali</button></div></div></div>
    </RoleProtected></Protected>
  );

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "canteen"]}>
        <NavBar />
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}
        <div className="min-h-screen py-6 px-4">
          <div className="max-w-4xl mx-auto fade-in">
            <div className="auth-card auth-glass p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div><h1 className="auth-title">Borang C6</h1><p className="text-lg font-bold text-blue-700">{record.orderNumber}</p></div>
                <button onClick={() => router.push("/borang/borangc6/view")} className="auth-btn auth-btn-small-alt" style={{ width: 'auto' }}>← Senarai</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white/60 p-4 border text-center"><div className="text-xs text-slate-500 mb-1">No. Pesanan</div><div className="text-sm font-bold text-blue-700">{record.orderNumber}</div></div>
                <div className="rounded-xl bg-white/60 p-4 border text-center"><div className="text-xs text-slate-500 mb-1">Tarikh</div><div className="text-sm font-semibold">{record.orderDate ? new Date(record.orderDate).toLocaleDateString("ms-MY") : "-"}</div></div>
                <div className="rounded-xl bg-white/60 p-4 border text-center"><div className="text-xs text-slate-500 mb-1">Bil. Murid</div><div className="text-lg font-bold text-emerald-600">{record.studentCount || 0}</div></div>
                <div className="rounded-xl bg-white/60 p-4 border text-center"><div className="text-xs text-slate-500 mb-1">Dicipta</div><div className="text-xs font-medium">{record.orderDate ? new Date(record.orderDate).toLocaleDateString("ms-MY") : "-"}</div></div>
              </div>

              <div className="space-y-4">
                <div className="auth-card auth-popup p-4" style={{ height: 'auto' }}>
                  <h3 className="font-semibold mb-3 text-center border-b pb-2">Pesanan dibuat oleh</h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500">Nama:</span><div className="font-medium">{record.createdByName || "-"}</div></div>
                    <div><span className="text-slate-500">Jawatan:</span><div className="font-medium">{record.createdByPosition || "-"}</div></div>
                  </div>
                </div>
                <div className="auth-card auth-popup p-4" style={{ height: 'auto' }}>
                  <h3 className="font-semibold mb-3 text-center border-b pb-2">Disahkan oleh</h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-500">Nama:</span><div className="font-medium">{record.approvedByName || "-"}</div></div>
                    <div><span className="text-slate-500">Jawatan:</span><div className="font-medium">{record.approvedByPosition || "-"}</div></div>
                  </div>
                </div>
                <div className="auth-card auth-popup p-4" style={{ height: 'auto' }}>
                  <h3 className="font-semibold mb-3 text-center border-b pb-2">Diterima oleh pembekal</h3>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div><span className="text-slate-500">Nama:</span><div className="font-medium">{record.recievedByName || "-"}</div></div>
                    <div><span className="text-slate-500">Jawatan:</span><div className="font-medium">{record.recievedByPosition || "-"}</div></div>
                    <div><span className="text-slate-500">Tarikh:</span><div className="font-medium">{record.recievedDate || "-"}</div></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button onClick={handlePrint} className="auth-btn auth-btn-purple flex-1 flex items-center justify-center gap-2">🖨️ Cetak Borang</button>
                <button onClick={handleDelete} className="px-4 py-3 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition flex items-center justify-center gap-2 flex-1">🗑️ Padam Borang</button>
              </div>
              <div className="text-center text-xs italic opacity-50 pt-2">( Sila kepilkan salinan asal borang ini apabila membuat tuntutan bayaran )</div>
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}