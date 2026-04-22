"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Protected from "../../../../components/Protected";
import RoleProtected from "../../../../components/RoleProtected";
import NavBar from "../../../../components/NavBar";
import { db } from "../../../../lib/firebase";
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";

function PopupModal({ title, message, type, onClose, onConfirm, showConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="auth-card auth-glass rounded-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className={`px-6 py-4 ${type === "success" ? "bg-emerald-500" : type === "error" ? "bg-red-500" : "bg-purple-600"} text-white`}>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="px-6 py-5"><p className="text-slate-700">{message}</p></div>
        <div className="px-6 py-4 flex justify-end gap-3">
          {showConfirm ? (<><button onClick={onClose} className="auth-btn auth-btn-small-alt">Cancel</button><button onClick={onConfirm} className="auth-btn auth-btn-primary">Confirm</button></>) : (<button onClick={onClose} className="auth-btn auth-btn-primary">OK</button>)}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  const showPopup = (title, message, type = "info", onConfirm = null) => setPopup({ title, message, type, onConfirm, showConfirm: !!onConfirm });
  const closePopup = () => setPopup(null);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!invoiceId) return;
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "invoices", invoiceId));
        if (snap.exists()) setInvoice({ id: snap.id, ...snap.data() });
        else showPopup("Error", "Invoice not found", "error");
      } catch (err) {
        showPopup("Error", "Failed to load invoice", "error");
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [invoiceId]);

  const handlePrint = () => {
    if (!invoice) return;
    const items = invoice.items || [];
    const itemRows = items.map((item, i) => `<tr><td style="border:1px solid #ddd;padding:8px;text-align:center">${i+1}</td><td style="border:1px solid #ddd;padding:8px">${item.description}</td><td style="border:1px solid #ddd;padding:8px;text-align:center">${item.quantity}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">RM ${Number(item.unitPrice).toFixed(2)}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">RM ${Number(item.total).toFixed(2)}</td></tr>`).join("");
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title><style>@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;border:1px solid #ddd;padding:8px}</style></head><body><div style="text-align:center"><h1>INVOICE</h1><h2>${invoice.clientName || "Sekolah Kebangsaan Taman Putra Perdana"}</h2></div><p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p><p><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString("ms-MY")}</p><p><strong>Status:</strong> ${invoice.status}</p><table><thead><tr><th>BIL</th><th>DESCRIPTION</th><th>QTY</th><th>UNIT PRICE</th><th>TOTAL</th></tr></thead><tbody>${itemRows}</tbody></table><h2 style="text-align:right;margin-top:30px">Total: RM ${Number(invoice.total).toFixed(2)}</h2><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
    w.document.close();
  };

  const handleDelete = () => {
    showPopup("Confirm Delete", `Delete invoice ${invoice?.invoiceNumber}?`, "confirm", async () => {
      closePopup();
      try {
        await deleteDoc(doc(db, "invoices", invoiceId));
        showPopup("Success", "Invoice deleted!", "success");
        setTimeout(() => router.push("/borang/invoice/view"), 1500);
      } catch (err) {
        showPopup("Error", "Failed to delete invoice", "error");
      }
    });
  };

  const handleUpdateStatus = (newStatus) => {
    showPopup("Confirm Status Update", `Update status to "${newStatus}"?`, "confirm", async () => {
      closePopup();
      try {
        await updateDoc(doc(db, "invoices", invoiceId), { status: newStatus });
        setInvoice(prev => ({ ...prev, status: newStatus }));
        showPopup("Success", "Status updated!", "success");
      } catch (err) {
        showPopup("Error", "Failed to update status", "error");
      }
    });
  };

  if (loading) return <Protected><RoleProtected allowedRoles={["admin", "finance"]}><NavBar /><div className="max-w-6xl mx-auto px-4"><div className="auth-card auth-glass p-6 flex items-center justify-center min-h-[300px]">Loading invoice...</div></div></RoleProtected></Protected>;

  if (!invoice) return (
    <Protected><RoleProtected allowedRoles={["admin", "finance"]}><NavBar />
      {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}
      <div className="max-w-6xl mx-auto px-4"><div className="auth-card auth-glass p-6 text-center"><h1 className="text-2xl font-semibold text-slate-700">Invoice Not Found</h1><button onClick={() => router.push("/borang/invoice/view")} className="btn-outline mt-4">Back to Invoices</button></div></div>
    </RoleProtected></Protected>
  );

  const items = invoice.items || [];

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "finance"]}>
        <NavBar />
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}
        <div className="max-w-6xl mx-auto px-4">
          <div className="auth-card auth-glass p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div><h1 className="auth-welcome">Invoice Details</h1><p className="text-sm text-slate-600">{invoice.invoiceNumber}</p></div>
              <button onClick={() => router.push("/borang/invoice/view")} className="btn-outline">← Back</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-xl bg-white/60 p-4 border"><div className="text-sm text-slate-500">Invoice Number</div><div className="text-lg font-semibold">{invoice.invoiceNumber}</div></div>
              <div className="rounded-xl bg-white/60 p-4 border"><div className="text-sm text-slate-500">Date</div><div className="text-lg font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString("ms-MY")}</div></div>
              <div className="rounded-xl bg-white/60 p-4 border"><div className="text-sm text-slate-500">Total Students</div><div className="text-lg font-semibold">{items.length}</div></div>
              <div className="rounded-xl bg-white/60 p-4 border"><div className="text-sm text-slate-500">Status</div><span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium mt-1 ${invoice.status === "pending" ? "bg-amber-100 text-amber-700" : invoice.status === "verified" ? "bg-emerald-100 text-emerald-700" : invoice.status === "paid" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}`}>{invoice.status}</span></div>
            </div>

            <div className="rounded-xl bg-white/60 p-4 border"><div className="text-sm text-slate-500">Client</div><div className="text-lg font-medium">{invoice.clientName || "Sekolah Kebangsaan Taman Putra Perdana"}</div></div>

            <div className="overflow-x-auto rounded-xl border bg-white/70">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Unit Price</th><th className="px-4 py-3 text-right">Total</th></tr></thead>
                <tbody>
                  {items.map((item, i) => <tr key={i} className="border-t"><td className="px-4 py-2 text-center">{i+1}</td><td className="px-4 py-2">{item.description}</td><td className="px-4 py-2 text-center">{item.quantity}</td><td className="px-4 py-2 text-right">RM {Number(item.unitPrice).toFixed(2)}</td><td className="px-4 py-2 text-right">RM {Number(item.total).toFixed(2)}</td></tr>)}
                  {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">No items.</td></tr>}
                </tbody>
                <tfoot className="bg-slate-50"><tr className="border-t-2"><td colSpan={4} className="px-4 py-3 text-right font-semibold">Total:</td><td className="px-4 py-3 text-right font-bold text-lg">RM {Number(invoice.total).toFixed(2)}</td></tr></tfoot>
              </table>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border">
              <div className="text-sm font-medium text-slate-600 mb-3">Update Status</div>
              <div className="flex flex-wrap gap-2">
                {["pending", "verified", "paid"].map(status => (
                  <button key={status} onClick={() => handleUpdateStatus(status)} disabled={invoice.status === status} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${invoice.status === status ? (status === "pending" ? "bg-amber-200 text-amber-800 cursor-not-allowed" : status === "verified" ? "bg-emerald-200 text-emerald-800 cursor-not-allowed" : "bg-blue-200 text-blue-800 cursor-not-allowed") : (status === "pending" ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : status === "verified" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200")}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button onClick={handlePrint} className="btn-outline flex items-center gap-2">🖨️ Print</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition flex items-center gap-2">🗑️ Delete Invoice</button>
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}