"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../../components/Protected";
import RoleProtected from "../../../components/RoleProtected";
import NavBar from "../../../components/NavBar";
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, addDoc, doc, getDoc, orderBy } from "firebase/firestore";

function PopupModal({ title, message, type, onClose, onConfirm, showConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="auth-card auth-glass auth-popup rounded-3xl max-w-xl w-full mx-4 overflow-hidden">
        <div className="px-8 py-5 bg-purple-600 text-white"><h3 className="text-lg font-semibold">{title}</h3></div>
        <div className="px-6 py-5"><p className="text-slate-700">{message}</p></div>
        <div className="px-6 py-4 flex justify-end gap-3">
          {showConfirm ? (<><button onClick={onClose} className="auth-btn auth-btn-small">Cancel</button><button onClick={onConfirm} className="auth-btn auth-btn-primary">Confirm</button></>) : (<button onClick={onClose} className="auth-btn auth-btn-primary">OK</button>)}
        </div>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [pricePerMeal, setPricePerMeal] = useState(5.00);
  const [popup, setPopup] = useState(null);
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isNewSeries, setIsNewSeries] = useState(false);

  const showPopup = (title, message, type = "info", onConfirm = null) => setPopup({ title, message, type, onConfirm, showConfirm: !!onConfirm });
  const closePopup = () => setPopup(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "teachers", user.uid));
        if (snap.exists()) setCurrentUser({ id: user.uid, ...snap.data() });
      }
    });
    return () => unsubscribe();
  }, []);

  const loadStudents = async (dateStr = selectedDate) => {
    setLoading(true);
    try {
      const canteenSnap = await getDocs(query(collection(db, "canteen"), where("day", "==", dateStr), where("lunchReceived", "==", true)));
      const gradesSnap = await getDocs(collection(db, "grades"));
      const gradesMap = {};
      gradesSnap.docs.forEach(d => { gradesMap[d.id] = d.data(); });
      const studentsSnap = await getDocs(collection(db, "students"));
      const studentsMap = {};
      studentsSnap.docs.forEach(d => { studentsMap[d.id] = { id: d.id, ...d.data() }; });

      const studentsData = canteenSnap.docs.map(c => {
        const data = c.data();
        const student = studentsMap[data.student];
        if (!student) return null;
        const grade = gradesMap[student.grade] || {};
        return { id: student.id, studentId: student.studentId, name: student.name, gradeName: grade.name || "-", gradeYear: grade.Year || "-", quantity: 1, unitPrice: pricePerMeal, total: pricePerMeal };
      }).filter(Boolean);

      setStudents(studentsData);

      try {
        const invSnap = await getDocs(query(collection(db, "invoices"), orderBy("created", "desc")));
        if (!invSnap.empty) {
          const last = invSnap.docs[0].data();
          const nextNum = parseInt(last.invoiceNumber?.split('-')[1] || '0') + 1;
          setInvoiceNumber(`INV-${String(nextNum).padStart(4, '0')}`);
          setIsNewSeries(false);
        } else {
          setInvoiceNumber('INV-0001'); setIsNewSeries(true);
        }
      } catch {
        setInvoiceNumber('INV-0001'); setIsNewSeries(true);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);

  const subtotal = students.reduce((sum, s) => sum + s.total, 0);
  const totalStudents = students.length;

  const saveInvoice = async () => {
    if (!invoiceNumber || students.length === 0) { showPopup("Error", "Please ensure you have an invoice number and students", "error"); return null; }
    setSaving(true);
    try {
      const invoiceData = {
        invoiceNumber,
        invoiceDate: new Date(invoiceDate).toISOString(),
        clientName: "Sekolah Taman Putra Perdana",
        items: students.map(s => ({ description: `${s.name} (${s.studentId}) - Tahun ${s.gradeYear} ${s.gradeName}`, quantity: s.quantity, unitPrice: s.unitPrice, total: s.total })),
        total: subtotal,
        status: "pending",
        createdBy: currentUser?.id || null,
        created: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "invoices"), invoiceData);
      setSavedInvoiceId(ref.id);
      return { id: ref.id, ...invoiceData };
    } catch (err) {
      showPopup("Error", "Failed to create invoice", "error");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (savedInvoiceId) { showPopup("Info", "Invoice already saved!", "info"); return; }
    const result = await saveInvoice();
    if (result) { showPopup("Success", "Invoice created successfully!", "success"); setTimeout(() => router.push("/borang/invoice/view"), 1500); }
  };

  const handleSendToFinance = () => {
    if (!invoiceNumber || students.length === 0) { showPopup("Error", "Please ensure you have an invoice number and students", "error"); return; }
    showPopup("Confirm Send", `Send invoice ${invoiceNumber} (RM ${subtotal.toFixed(2)}) to Finance Department?`, "confirm", async () => {
      closePopup();
      try {
        let invoiceId = savedInvoiceId;
        if (!invoiceId) {
          const saved = await saveInvoice();
          if (!saved) return;
          invoiceId = saved.id;
        }
        const financeSnap = await getDocs(query(collection(db, "teachers"), where("role", "in", ["finance", "admin"])));
        const recipients = financeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (recipients.length === 0) { showPopup("Warning", "No finance staff found.", "error"); return; }
        await Promise.all(recipients.map(r => addDoc(collection(db, "notifications"), {
          type: "invoice", title: `New Invoice: ${invoiceNumber}`,
          message: `Meal order for ${totalStudents} students. Total: RM ${subtotal.toFixed(2)}.`,
          invoiceNumber, amount: subtotal, studentCount: totalStudents,
          status: "unread", recipient: r.id, sender: currentUser?.id || null,
          invoiceId, created: new Date().toISOString(),
        })));
        showPopup("Success", `Sent to ${recipients.length} Finance staff!`, "success");
        setTimeout(() => router.push("/notifications"), 1500);
      } catch (err) {
        showPopup("Error", "Failed to send notification.", "error");
      }
    });
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const itemRows = students.map((s, i) => `<tr><td style="border:1px solid #ddd;padding:8px;text-align:center">${i+1}</td><td style="border:1px solid #ddd;padding:8px">${s.name} (${s.studentId}) - Tahun ${s.gradeYear} ${s.gradeName}</td><td style="border:1px solid #ddd;padding:8px;text-align:center">${s.quantity}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">RM ${s.unitPrice.toFixed(2)}</td><td style="border:1px solid #ddd;padding:8px;text-align:right">RM ${s.total.toFixed(2)}</td></tr>`).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Invoice ${invoiceNumber}</title><style>@page{size:A4;margin:2cm}body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th{background:#f3f4f6;border:1px solid #ddd;padding:8px}</style></head><body><div style="text-align:center"><h1>INVOICE</h1><h2>Sekolah Taman Putra Perdana</h2></div><p><strong>Invoice #:</strong> ${invoiceNumber}</p><p><strong>Date:</strong> ${new Date(invoiceDate).toLocaleDateString("ms-MY")}</p><table><thead><tr><th>BIL</th><th>DESCRIPTION</th><th>QTY</th><th>UNIT PRICE</th><th>TOTAL</th></tr></thead><tbody>${itemRows}</tbody></table><h2 style="text-align:right;margin-top:30px">Total: RM ${subtotal.toFixed(2)}</h2><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script></body></html>`);
    printWindow.document.close();
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "finance"]}>
        <NavBar />
        {popup && <PopupModal {...popup} onClose={closePopup} onConfirm={popup.onConfirm} />}
        <div className="max-w-6xl mx-auto px-4">
          <div className="auth-card auth-glass p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div><h1 className="auth-welcome">Create Invoice</h1><p className="text-sm text-slate-600">Daily meal order billing</p></div>
              <button onClick={() => router.push("/borang/invoice/view")} className="auth-btn-small auth-btn-primary" style={{ whiteSpace: "normal", height: "65px" }}>📂 View All Invoices</button>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex-1"><label className="text-sm font-medium text-blue-800">Load Canteen Records For Date</label><input type="date" className="input w-full mt-1" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></div>
                <button onClick={() => { setSavedInvoiceId(null); loadStudents(selectedDate); }} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">{loading ? "Loading..." : "🔄 Load Records"}</button>
              </div>
            </div>

            {isNewSeries && <div className="rounded-xl bg-amber-50 border border-amber-200 p-4"><p className="text-sm font-medium text-amber-800">Starting New Invoice Series</p></div>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><label className="text-sm font-medium">Invoice Number</label><input type="text" className="input w-full mt-1" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Invoice Date</label><input type="date" className="input w-full mt-1" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Price / Meal (RM)</label><input type="number" step="0.01" className="input w-full mt-1" value={pricePerMeal} onChange={(e) => { const p = parseFloat(e.target.value)||0; setPricePerMeal(p); setStudents(prev => prev.map(s => ({ ...s, unitPrice: p, total: s.quantity * p }))); }} /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white/60 p-4 border"><div className="text-sm text-slate-500">Students</div><div className="text-2xl font-semibold">{totalStudents}</div></div>
              <div className="rounded-xl bg-white/60 p-4 border"><div className="text-sm text-slate-500">Total Amount</div><div className="text-2xl font-semibold">RM {subtotal.toFixed(2)}</div></div>
              <div className="rounded-xl bg-white/60 p-4 border"><div className="text-sm text-slate-500">Status</div><div className="text-sm font-medium text-amber-700 mt-1">Pending Verification</div></div>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-white/70">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Kelas</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Unit</th><th className="px-4 py-3 text-right">Total</th></tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-4 py-2">{i+1}</td>
                      <td className="px-4 py-2"><div className="font-medium">{s.name}</div><div className="text-xs text-slate-500">{s.studentId}</div></td>
                      <td className="px-4 py-2">{s.gradeName}</td>
                      <td className="px-4 py-2 text-center"><input type="number" min="1" max="10" className="w-16 text-center border rounded px-2 py-1" value={s.quantity} onChange={(e) => { const q = parseInt(e.target.value)||1; setStudents(prev => prev.map(st => st.id === s.id ? { ...st, quantity: q, total: q * st.unitPrice } : st)); }} /></td>
                      <td className="px-4 py-2 text-right">RM {s.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-medium">RM {s.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {loading && <tr><td colSpan={6} className="py-6 text-center">Loading students...</td></tr>}
                  {!loading && students.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No students received lunch on the selected date.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button onClick={() => router.back()} className="btn-outline">Back</button>
              <button onClick={handlePrint} className="btn-outline">Print Preview</button>
              <button onClick={handleSaveInvoice} disabled={students.length === 0} className="auth-btn-small auth-btn-primary" style={{ whiteSpace: "normal", height: "65px" }}>Save Invoice</button>
              <button onClick={handleSendToFinance} disabled={students.length === 0} className="auth-btn-small auth-btn-primary" style={{ whiteSpace: "normal", height: "65px" }}>Send for Verification</button>
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}