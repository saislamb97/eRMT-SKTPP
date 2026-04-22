import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDlEah5rojz9_yfsfOHjbwgUDOYKdSV93A",
  authDomain: "ermt-f4501.firebaseapp.com",
  projectId: "ermt-f4501",
  storageBucket: "ermt-f4501.firebasestorage.app",
  messagingSenderId: "320724640221",
  appId: "1:320724640221:web:f3a6d8ca68d15427769634",
  measurementId: "G-MFGDQZKPQM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const formatId = (n) => `RMT${String(n).padStart(3, "0")}`;

const GRADES = [
  { name: "DENIM", Year: 3 }, { name: "JERSEY", Year: 3 },
  { name: "LYCRA", Year: 3 }, { name: "ORGANZA", Year: 3 },
  { name: "POLYESTER", Year: 3 }, { name: "RAYON", Year: 3 },
  { name: "SATIN", Year: 3 }, { name: "WOOL", Year: 3 },
];

const STUDENTS = [
  { name: "AN NISAA ULJANNAH BINTI MOHD HELMI", grade: "DENIM" },
  { name: "MUHAMMAD RAYYAN RAFAEL BIN MOHD ~ZIN", grade: "DENIM" },
  { name: "MUHAMMAD SYAZWAN BIN SYAMSUL", grade: "DENIM" },
  { name: "NUR AINA NAJIHA BINTI MOHAMMAD FIRDAUS", grade: "DENIM" },
  { name: "NUR HAFIZAH BINTI ABDULLAH", grade: "DENIM" },
  { name: "MUHAMMAD RAIS HAIKAL BIN MOHAMAD FAIZ", grade: "DENIM" },
  { name: "NOOR SAIRAH BANU BINTI ABDULLAH", grade: "DENIM" },
  { name: "NUR NAZIHAH SHAHIDA BINTI NASRIN", grade: "DENIM" },
  { name: "SITI NUR SOLEHAH BINTI MOHD SAMSANI", grade: "DENIM" },
  { name: "MOHAMAD FIKRI BIN ABDULLAH", grade: "DENIM" },
  { name: "NURHIDAYAH HANA BINTI ABDULLAH", grade: "DENIM" },
  { name: "MUHAMMAD ZAFRAN IRHAM BIN AMIROL", grade: "DENIM" },
  { name: "SYARIFAH ALEESYA SYAKIRAH BINTI SYED ZULKIFLI", grade: "JERSEY" },
  { name: "LEYSHMEN A/L THIAGAN", grade: "JERSEY" },
  { name: "MUHAMMAD IDLAN DANNY BIN RADZUAN", grade: "JERSEY" },
  { name: "QASEH QAISARA BINTI ZULKIFLI", grade: "JERSEY" },
  { name: "MUHAMMAD AIMAN BIN ABDULLAH", grade: "JERSEY" },
  { name: "SURI AMANI BINTI MUHAMMAD DHIRAR", grade: "JERSEY" },
  { name: "PUTRI AISYAH INARA BINTI BADRISAH", grade: "LYCRA" },
  { name: "WAN ALEESYA DHIYAA HANA BINTI WAN AZLAN", grade: "LYCRA" },
  { name: "DAIEE DHAMEER HARRAZ DZUNNUUN BIN MOHD DIN", grade: "LYCRA" },
  { name: "PUTRI ARIANA MARISA BINTI RUSSYAIZARUL", grade: "LYCRA" },
  { name: "PUTRI DANIA UMAIRAH BINTI MUHAMAD AZIZI", grade: "LYCRA" },
  { name: "MUHAMMAD FATHURRAHMAN BIN ZULAZLAN", grade: "ORGANZA" },
  { name: "MUHAMMAD RAYYAN FURQAN BIN MAHADI", grade: "ORGANZA" },
  { name: "NUR ALISYA SOFEA BINTI MOHAMAD POZI", grade: "ORGANZA" },
  { name: "SALMAN DARWISH BIN MOHD ROSLI", grade: "ORGANZA" },
  { name: "NUR IMANI JANNAH BINTI MUSTAPHA", grade: "POLYESTER" },
  { name: "SITI NUR ARINAH BINTI HERMAN", grade: "RAYON" },
  { name: "ANDRIAN JANTING ANAK WELFREN MUNANG", grade: "SATIN" },
  { name: "AMIRUL WAFIQ AKIF BIN MOHD SALIM", grade: "WOOL" },
  { name: "SULAIMAN BIN NORWADI", grade: "WOOL" },
];

async function seed() {
  console.log("🌱 Starting seed...\n");
  const existingGrades = await getDocs(collection(db, "grades"));
  if (existingGrades.size > 0) {
    console.log("⚠️  Grades already exist! Aborting."); process.exit(1);
  }
  console.log("📚 Creating grades...");
  const gradeMap = {};
  for (const grade of GRADES) {
    const ref = await addDoc(collection(db, "grades"), grade);
    gradeMap[grade.name] = ref.id;
    console.log(`   ✅ ${grade.name} → ${ref.id}`);
  }
  console.log("\n👦 Creating students...");
  for (let i = 0; i < STUDENTS.length; i++) {
    const s = STUDENTS[i];
    const studentId = formatId(i + 1);
    await addDoc(collection(db, "students"), { name: s.name, grade: gradeMap[s.grade], studentId });
    console.log(`   ✅ ${studentId} — ${s.name} (${s.grade})`);
  }
  console.log(`\n🎉 Done! 8 grades, 32 students.`);
  process.exit(0);
}

seed().catch(err => { console.error("❌ Failed:", err); process.exit(1); });