"use client";
import { useState, useEffect } from "react";

// Predefined positions/roles
const POSITIONS = [
  { value: "Pentadbir", label: "Pentadbir (Admin)" },
  { value: "Guru Besar", label: "Guru Besar (Headmaster)" },
  { value: "Penolong Kanan", label: "Penolong Kanan (Senior Assistant)" },
  { value: "Guru", label: "Guru (Teacher)" },
  { value: "Guru RMT", label: "Guru RMT (RMT Teacher)" },
  { value: "Pengurus Kewangan", label: "Pengurus Kewangan (Finance)" },
  { value: "Operator Kantin", label: "Operator Kantin (Canteen Op.)" },
  { value: "Pembekal Makanan", label: "Pembekal Makanan (Food Supplier)" },
  { value: "Kerani", label: "Kerani (Clerk)" },
];

export default function PositionSelect({ 
  value,
  onChange,
  label = "Jawatan (T / tangan & Cop)",
  required = false,
  className = "",
  useAuthStyle = false  // Toggle for auth/glass styling
}) {
  const [isManual, setIsManual] = useState(false);
  const [manualValue, setManualValue] = useState("");

  // Check if current value is a predefined position
  useEffect(() => {
    if (value) {
      const isPredefined = POSITIONS.some(p => p.value === value);
      if (!isPredefined && value !== "") {
        setIsManual(true);
        setManualValue(value);
      }
    }
  }, []);

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    
    if (selectedValue === "manual") {
      setIsManual(true);
      onChange?.(manualValue);
    } else {
      setIsManual(false);
      onChange?.(selectedValue);
    }
  };

  const handleManualChange = (e) => {
    const val = e.target.value;
    setManualValue(val);
    onChange?.(val);
  };

  // Determine select value
  const selectValue = isManual ? "manual" : (value || "");
  
  // Style classes
  const labelClass = useAuthStyle ? "auth-label" : "label";
  const inputClass = useAuthStyle ? "auth-input" : "input";

  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      <select
        value={selectValue}
        onChange={handleSelectChange}
        className={inputClass}
        required={required && !isManual}
      >
        <option value="">-- Pilih Jawatan --</option>
        {POSITIONS.map((pos) => (
          <option key={pos.value} value={pos.value}>
            {pos.label}
          </option>
        ))}
        <option value="manual">✏️ Lain-lain (Masukkan manual)...</option>
      </select>
      
      {isManual && (
        <input
          type="text"
          value={manualValue}
          onChange={handleManualChange}
          placeholder="Masukkan jawatan"
          className={`${inputClass} mt-2`}
          required={required}
        />
      )}
    </div>
  );
}
