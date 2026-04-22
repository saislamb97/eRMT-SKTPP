"use client";

import "../../special.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../../components/Protected";
import RoleProtected from "../../../components/RoleProtected";
import NavBar from "../../../components/NavBar";
import TeacherSelect from "../../../components/TeacherSelect";
import PositionSelect from "../../../components/PositionSelect";

export default function BorangC6Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  
  // Data states
  const [orderNumber, setOrderNumber] = useState("Loading...");
  const [orderNumberLoading, setOrderNumberLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [studentCountLoading, setStudentCountLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    orderDate: new Date().toISOString().slice(0, 10),
    numberOfMeals: 0,
    executionDate: '',
    executionDateReceived: '',
    // Pesanan dibuat oleh
    orderedById: null,
    orderedByName: '',
    orderedByPosition: '',
    // Disahkan oleh
    approvedById: null,
    approvedByName: '',
    approvedByPosition: '',
    // Borang diterima oleh
    receivedById: null,
    receivedByName: '',
    receivedByPosition: '',
    receivedDate: ''
  });

  // Load order number and student count on mount
  useEffect(() => {
    loadOrderNumber();
    loadStudentCount();
  }, []);

  const loadOrderNumber = async () => {
    try {
      setOrderNumberLoading(true);
      const response = await fetch("/api/borang-c6?type=nextOrderNumber");
      const data = await response.json();
      if (data.success) {
        setOrderNumber(data.orderNumber);
      } else {
        setOrderNumber("C6-ERR");
      }
    } catch (err) {
      console.error("Failed to load order number:", err);
      setOrderNumber("C6-ERR");
    } finally {
      setOrderNumberLoading(false);
    }
  };

  const loadStudentCount = async () => {
    try {
      setStudentCountLoading(true);
      const response = await fetch("/api/borang-c6?type=studentCount");
      const data = await response.json();
      if (data.success) {
        setStudentCount(data.count || 0);
        setFormData(prev => ({ ...prev, numberOfMeals: data.count || 0 }));
      }
    } catch (err) {
      console.error("Failed to load student count:", err);
    } finally {
      setStudentCountLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (!formData.orderedByName) {
      setError("Sila pilih nama untuk 'Pesanan dibuat oleh'");
      return;
    }
    if (!formData.orderedByPosition) {
      setError("Sila pilih jawatan untuk 'Pesanan dibuat oleh'");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    
    try {
      const response = await fetch("/api/borang-c6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionDate: formData.executionDate || null,
          executionDay: formData.executionDateReceived 
            ? new Date(formData.executionDateReceived).getDay() 
            : null,
          studentCount: formData.numberOfMeals,
          createdBy: formData.orderedById,
          createdByName: formData.orderedByName,
          createdByPosition: formData.orderedByPosition,
          approvedByName: formData.approvedByName,
          approvedByPosition: formData.approvedByPosition,
          receivedByName: formData.receivedByName,
          receivedByPosition: formData.receivedByPosition,
          receivedDate: formData.receivedDate,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMessage(`Borang C6 berjaya disimpan! No. Pesanan: ${result.orderNumber}`);
        
        // Reset form after 2 seconds
        setTimeout(() => {
          setFormData({
            orderDate: new Date().toISOString().slice(0, 10),
            numberOfMeals: studentCount,
            executionDate: '',
            executionDateReceived: '',
            orderedById: null,
            orderedByName: '',
            orderedByPosition: '',
            approvedById: null,
            approvedByName: '',
            approvedByPosition: '',
            receivedById: null,
            receivedByName: '',
            receivedByPosition: '',
            receivedDate: ''
          });
          setMessage("");
          setStep(1);
          // Reload next order number
          loadOrderNumber();
        }, 2000);
      } else {
        throw new Error(result.error || "Gagal menyimpan borang");
      }
    } catch (err) {
      setError(err.message || "Gagal menyimpan borang");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Borang C6 - ${orderNumber}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid black;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .header-left h1 { margin: 0 0 5px 0; font-size: 18px; }
          .borang-box {
            border: 2px solid black;
            padding: 8px 15px;
            font-weight: bold;
            font-size: 14px;
          }
          .no-section { text-align: right; margin-bottom: 20px; }
          .form-row { display: flex; align-items: baseline; margin-bottom: 10px; }
          .form-row label { min-width: 200px; font-weight: 600; }
          .form-row .value {
            border-bottom: 1px dotted black;
            flex: 1;
            min-height: 20px;
            padding: 0 5px;
          }
          .section-title { font-weight: bold; margin: 25px 0 15px 0; font-size: 14px; }
          .signature-section { margin: 20px 0; padding-left: 20px; }
          .signature-row { display: flex; margin-bottom: 10px; }
          .signature-row label { min-width: 100px; font-weight: 600; }
          .signature-row .value {
            border-bottom: 1px dotted black;
            flex: 1;
            padding: 0 5px;
            min-height: 20px;
          }
          .signature-note { margin-left: 20px; font-size: 12px; color: #666; }
          .footer-note { text-align: center; font-style: italic; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left"><h1>PERJANJIAN RMT</h1></div>
          <div class="borang-box">Borang C6</div>
        </div>
        <div style="text-align:center">
          <h2 style="margin:10px 0">BORANG PESANAN HARIAN</h2>
          <p style="margin:0">BEKALAN MAKANAN RANCANGAN MAKANAN TAMBAHAN SEKOLAH</p>
        </div>
        <div class="no-section">
          NO: <span style="border-bottom: 1px dotted black; display: inline-block; min-width: 120px; padding: 0 5px; font-weight: bold;">${orderNumber}</span>
        </div>
        <div class="form-row">
          <label>Tarikh pesanan dibuat</label><span>:</span>
          <div class="value">${new Date(formData.orderDate).toLocaleDateString('ms-MY')}</div>
        </div>
        <div class="form-row">
          <label>Bil. murid yang makan</label><span>:</span>
          <div class="value">${formData.numberOfMeals}</div>
        </div>
        <div class="form-row">
          <label>Hari pelaksanaan</label><span>:</span>
          <div class="value" style="flex: 0.5;">${formData.executionDate ? new Date(formData.executionDate).toLocaleDateString('ms-MY') : ''}</div>
          <label style="margin-left: 40px; min-width: 150px;">Tarikh pelaksanaan</label><span>:</span>
          <div class="value" style="flex: 0.4;">${formData.executionDateReceived ? new Date(formData.executionDateReceived).toLocaleDateString('ms-MY') : ''}</div>
        </div>
        <div class="section-title">Pesanan dibuat oleh</div>
        <div class="signature-section">
          <div class="signature-row"><label>Nama</label><span>:</span><div class="value">${formData.orderedByName}</div></div>
          <div class="signature-row"><label>Jawatan</label><span>:</span><div class="value">${formData.orderedByPosition}</div><span class="signature-note">( T / tangan & Cop )</span></div>
        </div>
        <div class="section-title">Disahkan oleh</div>
        <div class="signature-section">
          <div class="signature-row"><label>Nama</label><span>:</span><div class="value">${formData.approvedByName}</div></div>
          <div class="signature-row"><label>Jawatan</label><span>:</span><div class="value">${formData.approvedByPosition}</div><span class="signature-note">( T / tangan & Cop )</span></div>
        </div>
        <div class="section-title">Borang pesanan diterima oleh pembekal makanan</div>
        <div class="signature-section">
          <div class="signature-row"><label>Nama</label><span>:</span><div class="value">${formData.receivedByName}</div></div>
          <div class="signature-row"><label>Jawatan</label><span>:</span><div class="value">${formData.receivedByPosition}</div><span class="signature-note">( T / tangan & Cop )</span></div>
          <div class="signature-row"><label>Tarikh</label><span>:</span><div class="value">${formData.receivedDate ? new Date(formData.receivedDate).toLocaleDateString('ms-MY') : ''}</div></div>
        </div>
        <div class="footer-note">( Sila kepilkan salinan asal borang ini apabila membuat tuntutan bayaran )</div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "canteen"]}>
        <NavBar />
        <div className="min-h-screen py-6 px-4">
          <div className="max-w-2xl mx-auto fade-in">
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="auth-title">Borang C6 - Daily Meal Order</h1>
                <p className="text-sm opacity-60 mt-1">Langkah {step} daripada 2</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{ width: '150px' }}
                  className="auth-btn auth-btn-small-alt"
                >
                  🖨️ Cetak
                </button>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700">
                {message}
              </div>
            )}

            {/* Main Form Card */}
            <div className="auth-card auth-glass p-6">
              {/* STEP 1 */}
              {step === 1 && (
                <form onSubmit={handleNext} className="space-y-5">
                  {/* Header Info */}
                  <div className="text-center pb-4 border-b border-white/30">
                    <h2 className="font-semibold text-lg">PERJANJIAN RMT</h2>
                    <p className="text-sm opacity-70">BORANG PESANAN HARIAN</p>
                    <p className="text-sm opacity-70">BEKALAN MAKANAN RANCANGAN MAKANAN TAMBAHAN SEKOLAH</p>
                  </div>

                  {/* Order Number - DISPLAYS ACTUAL VALUE */}
                  <div>
                    <label className="auth-label">No. Pesanan</label>
                    <input
                      type="text"
                      className="auth-input"
                      value={orderNumberLoading ? "Memuatkan..." : orderNumber}
                      readOnly
                      disabled
                      style={{ 
                        fontWeight: 'bold', 
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        borderColor: 'rgba(16, 185, 129, 0.4)',
                        color: '#065f46'
                      }}
                    />
                    <p className="text-xs opacity-50 mt-1 text-center">
                      Dijana secara automatik dan tidak boleh diubah
                    </p>
                  </div>

                  {/* Order Details Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="auth-label">Tarikh Pesanan Dibuat</label>
                      <input
                        type="date"
                        className="auth-input"
                        value={formData.orderDate}
                        readOnly
                        disabled
                        style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                      />
                    </div>

                    <div>
                      <label className="auth-label">Bil. Murid yang Makan</label>
                      <input
                        type="number"
                        className="auth-input"
                        value={studentCountLoading ? "" : formData.numberOfMeals}
                        placeholder={studentCountLoading ? "Memuatkan..." : ""}
                        readOnly
                        disabled
                        style={{ backgroundColor: 'rgba(255,255,255,0.5)' }}
                      />
                    </div>

                    <div>
                      <label className="auth-label">Hari Pelaksanaan</label>
                      <input
                        type="date"
                        className="auth-input"
                        value={formData.executionDate}
                        onChange={(e) => handleChange('executionDate', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="auth-label">Tarikh Pelaksanaan</label>
                      <input
                        type="date"
                        className="auth-input"
                        value={formData.executionDateReceived}
                        onChange={(e) => handleChange('executionDateReceived', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Pesanan dibuat oleh */}
                  <div className="auth-card auth-popup p-4" style={{ height: 'auto' }}>
                    <h3 className="font-semibold mb-3 text-center">Pesanan dibuat oleh</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TeacherSelect
                        value={formData.orderedById}
                        nameValue={formData.orderedByName}
                        onChange={(id) => handleChange('orderedById', id)}
                        onNameChange={(name) => handleChange('orderedByName', name)}
                        label="Nama"
                        required
                        useAuthStyle={true}
                      />
                      <PositionSelect
                        value={formData.orderedByPosition}
                        onChange={(val) => handleChange('orderedByPosition', val)}
                        required
                        useAuthStyle={true}
                      />
                    </div>
                  </div>

                  <button type="submit" className="auth-btn auth-btn-primary w-full">
                    Seterusnya →
                  </button>
                </form>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Disahkan oleh */}
                  <div className="auth-card auth-popup p-4" style={{ height: 'auto' }}>
                    <h3 className="font-semibold mb-3 text-center">Disahkan oleh</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TeacherSelect
                        value={formData.approvedById}
                        nameValue={formData.approvedByName}
                        onChange={(id) => handleChange('approvedById', id)}
                        onNameChange={(name) => handleChange('approvedByName', name)}
                        label="Nama"
                        required
                        useAuthStyle={true}
                      />
                      <PositionSelect
                        value={formData.approvedByPosition}
                        onChange={(val) => handleChange('approvedByPosition', val)}
                        required
                        useAuthStyle={true}
                      />
                    </div>
                  </div>

                  {/* Borang diterima oleh pembekal */}
                  <div className="auth-card auth-popup p-4" style={{ height: 'auto' }}>
                    <h3 className="font-semibold mb-3 text-center">Borang pesanan diterima oleh pembekal makanan</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TeacherSelect
                        value={formData.receivedById}
                        nameValue={formData.receivedByName}
                        onChange={(id) => handleChange('receivedById', id)}
                        onNameChange={(name) => handleChange('receivedByName', name)}
                        label="Nama"
                        required
                        useAuthStyle={true}
                      />
                      <PositionSelect
                        value={formData.receivedByPosition}
                        onChange={(val) => handleChange('receivedByPosition', val)}
                        required
                        useAuthStyle={true}
                      />
                      <div className="sm:col-span-2">
                        <label className="auth-label">Tarikh</label>
                        <input
                          type="date"
                          className="auth-input"
                          value={formData.receivedDate}
                          onChange={(e) => handleChange('receivedDate', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Note */}
                  <div className="text-center text-sm italic opacity-60 p-3">
                    ( Sila kepilkan salinan asal borang ini apabila membuat tuntutan bayaran )
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={handleBack} 
                      className="auth-btn auth-btn-small-alt flex-1"
                      style={{ width: 'auto' }}
                    >
                      ← Kembali
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <p className="text-center text-sm opacity-50 mt-6">
              e-RMT@Sekolah Kebangsaan Taman Putra Perdana
            </p>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}
