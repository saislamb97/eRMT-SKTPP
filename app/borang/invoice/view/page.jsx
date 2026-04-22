"use client";
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
            <span className="text-2xl">{type === "success" ? "✓" : type === "error" ? "✕" : "?"}</span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
        </div>
        <div className="px-6 py-5"><p className="text-slate-700">{message}</p></div>
        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          {showConfirm ? (<><button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600">Cancel</button><button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Confirm</button></>) : (<button onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 text-white">OK</button>)}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceRepositoryPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);

  const showPopup = (title, message, type = "info", onConfirm = null) => setPopup({ title, message, type, onConfirm, showConfirm: !!onConfirm });
  const closePopup = () => setPopup(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "invoices"), orderBy("created", "desc")));
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvoices(); }, []);

  const handleDelete = (inv) => {
    showPopup("Confirm Delete", `Delete invoice ${inv.invoiceNumber}?`, "confirm", async () => {
      closePopup();
      try {
        await deleteDoc(doc(db, "invoices", inv.id));
        showPopup("Success", "Invoice deleted!", "success");
        loadInvoices();
      } catch (err) {
        showPopup("Error", "Failed to delete invoice", "error");
      }
    });
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "finance"]}>
        <NavBar />
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}
        <div className="max-w-6xl mx-auto px-4">
          <div className="auth-card auth-glass p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div><h1 className="auth-welcome">Invoice Repository</h1><p className="text-sm text-slate-600">All generated meal invoices</p></div>
              <button onClick={() => router.push("/borang/invoice")} className="auth-btn-small auth-btn-primary" style={{ whiteSpace: "normal", height: "65px" }}>+ Create New Invoice</button>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-white/70">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-center">Students</th><th className="px-4 py-3 text-right">Total (RM)</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="py-6 text-center">Loading invoices...</td></tr>}
                  {!loading && invoices.map(inv => (
                    <tr key={inv.id} className="border-t hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2">{new Date(inv.invoiceDate).toLocaleDateString("ms-MY")}</td>
                      <td className="px-4 py-2 text-center">{inv.items?.length || 0}</td>
                      <td className="px-4 py-2 text-right">RM {Number(inv.total).toFixed(2)}</td>
                      <td className="px-4 py-2"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${inv.status === "pending" ? "bg-amber-100 text-amber-700" : inv.status === "verified" ? "bg-emerald-100 text-emerald-700" : inv.status === "paid" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{inv.status}</span></td>
                      <td className="px-4 py-2 text-right"><div className="flex gap-2 justify-end"><button className="btn-outline" onClick={() => router.push(`/borang/invoice/${inv.id}`)}>View</button><button className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-sm" onClick={() => handleDelete(inv)}>🗑️</button></div></td>
                    </tr>
                  ))}
                  {!loading && invoices.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No invoices found.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end"><button onClick={() => router.back()} className="btn-outline">Back</button></div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}