"use client";
import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function TeacherSelect({ 
  value,
  nameValue,
  onChange,
  onNameChange,
  label = "Nama",
  required = false,
  className = "",
  useAuthStyle = false
}) {
  const [teachers, setTeachers] = useState([]);
  const [isManual, setIsManual] = useState(false);
  const [manualName, setManualName] = useState(nameValue || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    if (nameValue && isManual) setManualName(nameValue);
  }, [nameValue]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, "teachers"), orderBy("name")));
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load teachers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChange = (e) => {
    const selectedId = e.target.value;
    if (selectedId === "manual") {
      setIsManual(true);
      onChange?.(null);
      onNameChange?.(manualName);
    } else if (selectedId) {
      setIsManual(false);
      const teacher = teachers.find(t => t.id === selectedId);
      onChange?.(selectedId);
      onNameChange?.(teacher?.name || "");
    } else {
      setIsManual(false);
      onChange?.(null);
      onNameChange?.("");
    }
  };

  const handleManualChange = (e) => {
    const name = e.target.value;
    setManualName(name);
    onNameChange?.(name);
  };

  const selectValue = isManual ? "manual" : (value || "");
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
        disabled={loading}
      >
        <option value="">
          {loading ? "Memuatkan..." : "-- Pilih Guru --"}
        </option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.name}
          </option>
        ))}
        <option value="manual">✏️ Lain-lain (Masukkan manual)...</option>
      </select>

      {isManual && (
        <input
          type="text"
          value={manualName}
          onChange={handleManualChange}
          placeholder="Masukkan nama"
          className={`${inputClass} mt-2`}
          required={required}
        />
      )}
    </div>
  );
}