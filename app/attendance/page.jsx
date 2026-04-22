"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Protected from "../../components/Protected";
import RoleProtected from "../../components/RoleProtected";
import NavBar from "../../components/NavBar";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from "firebase/firestore";

export default function AttendanceScanPage() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualStudent, setManualStudent] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [camId, setCamId] = useState("");
  const html5qrcodeRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanList, setScanList] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const [scanPopup, setScanPopup] = useState({ show: false, message: "" });
  const [todayStats, setTodayStats] = useState({ scanned: 0, total: 0 });

  const getLocalDateString = () => {
    const now = new Date();
    const offset = 8 * 60;
    const localDate = new Date(now.getTime() + offset * 60 * 1000);
    return localDate.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const today = getLocalDateString();
        // Fetch all students, filter active client-side — no composite index needed
        const studentsSnap = await getDocs(collection(db, "students"));
        const activeCount = studentsSnap.docs.filter(d => d.data().active !== false).length;

        const scannedSnap = await getDocs(query(
          collection(db, "attendance"),
          where("day", "==", today),
          where("present", "==", true)
        ));
        setTodayStats({ total: activeCount, scanned: scannedSnap.size });

        const scanData = [];
        for (const d of scannedSnap.docs) {
          const data = d.data();
          scanData.push({ id: d.id, ...data, scannedAt: data.date || new Date().toISOString() });
        }
        setScanList(scanData);
      } catch (err) {
        console.error("Error loading stats:", err);
      }
    };
    loadStats();
  }, []);

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const cams = await Html5Qrcode.getCameras();
        if (!mounted) return;
        setCameras(cams || []);
        if (cams?.length && !camId) setCamId(cams[0].id);
        setReady(true);
      } catch (e) {
        setError("Camera init failed. " + (e?.message || e));
      }
    };
    setup();
    return () => { mounted = false; stopScanner(); };
  }, []);

  const allowNextRef = useRef(true);
  const onScanFailure = () => { allowNextRef.current = true; };

  const startScanner = async () => {
    try {
      setError(""); setStatus("");
      allowNextRef.current = true;
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!html5qrcodeRef.current) html5qrcodeRef.current = new Html5Qrcode("qr-reader");
      const constraints = isMobile
        ? { facingMode: "environment" }
        : camId ? { deviceId: { exact: camId } } : { facingMode: "user" };
      await html5qrcodeRef.current.start(
        constraints,
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanFailure
      );
      setScanning(true);
      setTimeout(() => {
        const video = document.querySelector("#qr-reader video");
        if (video && !isMobile) video.style.transform = "scaleX(-1)";
      }, 100);
    } catch (e) {
      setError("Unable to start camera: " + (e?.message || e));
    }
  };

  const stopScanner = async () => {
    try {
      if (html5qrcodeRef.current?.isScanning) await html5qrcodeRef.current.stop();
      await html5qrcodeRef.current?.clear();
    } catch (_) {} finally { setScanning(false); }
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError("");
      const { Html5Qrcode } = await import("html5-qrcode");
      const qr = new Html5Qrcode("qr-file-reader");
      const decodedText = await qr.scanFile(file, true);
      await onScanSuccess(decodedText);
    } catch (err) {
      setError("Failed to scan image: " + (err?.message || err));
    }
  };

  const showScanPopup = (message) => {
    setScanPopup({ show: true, message });
    setTimeout(() => setScanPopup({ show: false, message: "" }), 3000);
  };

  const markPresentByStudentId = async (studentId, fromScanner = false) => {
    if (fromScanner && !allowNextRef.current) return;
    if (fromScanner) allowNextRef.current = false;
    setError("");
    const id = String(studentId).trim();
    if (!id) return;

    try {
      setStatus(`Processing ID: ${id} ...`);
      const today = getLocalDateString();

      const studentSnap = await getDocs(
        query(collection(db, "students"), where("studentId", "==", id))
      );
      if (studentSnap.empty) throw new Error("Student not found");
      const studentDoc = studentSnap.docs[0];
      const student = { id: studentDoc.id, ...studentDoc.data() };

      if (student.active === false) {
        throw new Error(`${student.name} is inactive. Restore them first.`);
      }

      const existingSnap = await getDocs(query(
        collection(db, "attendance"),
        where("student", "==", student.id),
        where("day", "==", today)
      ));

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0];
        if (existing.data().present === true) {
          setStatus(`${student.name} is already marked present today.`);
          showScanPopup(`${student.name} already marked present`);
          setTimeout(() => setStatus(""), 3000);
          setManualId(""); setManualStudent(null);
          return;
        }
        await updateDoc(doc(db, "attendance", existing.id), { present: true });
      } else {
        await addDoc(collection(db, "attendance"), {
          student: student.id,
          present: true,
          date: new Date().toISOString(),
          day: today,
        });
      }

      setStatus(`✅ ${student.name} marked present!`);
      showScanPopup(`✅ ${student.name} marked present!`);
      setScanFlash(true);
      setTimeout(() => setScanFlash(false), 800);
      setTimeout(() => setStatus(""), 3000);

      setTodayStats((prev) => ({ ...prev, scanned: prev.scanned + 1 }));
      setScanList((prev) => [{
        id: `temp-${Date.now()}`,
        studentName: student.name,
        studentId: student.studentId,
        scannedAt: new Date().toISOString()
      }, ...prev]);
      setManualId(""); setManualStudent(null);
      setTimeout(() => setStatus(""), 3000);
    } catch (e) {
      setError(e?.message || "Student not found");
      showScanPopup(e?.message || "Student not found");
      setManualId(""); setManualStudent(null);
      setTimeout(() => setError(""), 5000);
    }
  };

  const onScanSuccess = async (decodedText) => { await markPresentByStudentId(decodedText, true); };

  const onManualSubmit = async (e) => {
    e.preventDefault();
    setStatus(""); setError(""); setManualStudent(null);
    const id = manualId.trim();
    if (!id) return;
    try {
      const snap = await getDocs(
        query(collection(db, "students"), where("studentId", "==", id))
      );
      if (snap.empty) throw new Error("Student not found for ID: " + id);
      const student = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (student.active === false) throw new Error(`${student.name} is inactive. Restore them first.`);
      setManualStudent(student);
    } catch (e) {
      setError(e.message);
      setManualId("");
      setTimeout(() => setError(""), 5000);
    }
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "teacher"]}>
        <NavBar />
        <div id="qr-file-reader" style={{ display: "none" }} />
        <div className="auth-card auth-glass p-6 space-y-4" style={{ maxWidth: '100%', overflow: 'hidden' }}>
          <div className="flex items-center justify-between">
            <h1 className="auth-welcome">Scan Attendance</h1>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">{todayStats.scanned} / {todayStats.total}</div>
              <div className="text-xs text-slate-600">Students Present Today</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2" style={{ minHeight: '0' }}>
            <div className="space-y-4" style={{ minWidth: '0' }}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  className="input"
                  style={{ maxWidth: '200px', minWidth: '150px' }}
                  value={camId}
                  onChange={(e) => setCamId(e.target.value)}
                >
                  {cameras.map((c) => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
                </select>
                {!scanning ? (
                  <button className="auth-btn-small auth-btn-primary" type="button" onClick={startScanner}>Start Camera</button>
                ) : (
                  <button className="auth-btn-small auth-btn-primary" type="button" onClick={stopScanner}>Stop</button>
                )}
                <label className="btn-outline cursor-pointer auth-btn-small">
                  <input type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
                  Scan Image
                </label>
              </div>

              <div style={{ position: 'relative', width: '100%', maxWidth: '100%' }}>
                <div
                  id="qr-reader"
                  className="w-full rounded-lg overflow-hidden bg-slate-100"
                  style={{
                    minHeight: '320px', maxHeight: '500px', aspectRatio: '1 / 1',
                    transition: 'all 0.3s ease',
                    boxShadow: scanFlash ? '0 0 40px rgba(16, 185, 129, 0.8)' : 'none',
                    border: scanFlash ? '4px solid rgba(16, 185, 129, 0.9)' : '4px solid transparent'
                  }}
                />
                {scanFlash && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3), transparent 70%)',
                    pointerEvents: 'none'
                  }} />
                )}
                {scanPopup.show && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)', zIndex: 100, minWidth: '280px'
                  }}>
                    <div className="rounded-lg px-6 py-4 shadow-2xl bg-gradient-to-br from-emerald-500 to-green-600 border-2 border-emerald-300">
                      <div className="flex items-center gap-3 text-white">
                        <span className="text-3xl">✅</span>
                        <div className="font-semibold text-lg">{scanPopup.message}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="auth-card auth-glass p-4 space-y-4">
                <div className="font-medium mb-2">Manual Attendance</div>
                <form onSubmit={onManualSubmit} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Enter Student ID"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                  />
                  <button className="auth-btn-small auth-btn-primary" type="submit">Lookup</button>
                </form>
                {manualStudent && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-100 px-4 py-3 text-emerald-900">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-lg">✅</span>
                        <div>
                          <div className="font-semibold">Student found</div>
                          <div>{manualStudent.name} ({manualStudent.studentId})</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="auth-btn-small auth-btn-primary"
                          style={{ whiteSpace: "normal", height: "65px" }}
                          type="button"
                          onClick={() => markPresentByStudentId(manualStudent.studentId)}
                        >
                          Confirm Present
                        </button>
                        <button
                          className="auth-btn-small-alt"
                          type="button"
                          onClick={() => { setManualStudent(null); setStatus(""); }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!ready && <div className="mt-2 text-sm text-slate-600">Loading camera devices...</div>}
            </div>

            <div className="space-y-4" style={{ minWidth: '0', overflow: 'hidden' }}>
              <div className="min-h-[100px]">
                {status && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-900 animate-pulse">
                    <span>✨ {status}</span>
                  </div>
                )}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-100 px-4 py-3 text-red-900">
                    <span>❌ {error}</span>
                  </div>
                )}
              </div>
              <div
                className="auth-card auth-glass p-4 flex flex-col"
                style={{ minHeight: '300px', maxHeight: '600px' }}
              >
                <div className="font-medium mb-3">Scanned Today ({scanList.length})</div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {scanList.length === 0 && (
                    <div className="text-sm text-slate-500">No scans yet today</div>
                  )}
                  {scanList.map((s, i) => (
                    <div key={s.id || i} className="rounded-lg border bg-white px-3 py-2 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{s.studentName || "Unknown"}</div>
                          <div className="text-xs text-slate-500">ID: {s.studentId}</div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(s.scannedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}