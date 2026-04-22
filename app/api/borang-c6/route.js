import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = 'nodejs';

// Initialize Firebase Admin (for server-side API routes)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

// GET
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "teachers") {
      const snap = await db.collection("teachers").orderBy("name").get();
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ success: true, data });
    }

    if (type === "studentCount") {
      const snap = await db.collection("students").get();
      return NextResponse.json({ success: true, count: snap.size, source: "students" });
    }

    if (type === "nextOrderNumber") {
      const orderNumber = await getNextOrderNumber(db);
      return NextResponse.json({ success: true, orderNumber });
    }

    // Fetch all borang_c6 records
    const snap = await db.collection("borang_c6").orderBy("orderDate", "desc").get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Borang C6 GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST
export async function POST(request) {
  try {
    const data = await request.json();

    const orderNumber = await generateAndIncrementOrderNumber(db);

    let studentCount = data.studentCount;
    if (studentCount === undefined || studentCount === null || studentCount === '') {
      const snap = await db.collection("students").get();
      studentCount = snap.size;
    }

    const recordData = {
      orderNumber,
      orderDate: new Date().toISOString(),
      executionDate: data.executionDate || null,
      executionDay: data.executionDay || null,
      studentCount,
      createdBy: data.createdBy || null,
      createdByName: data.createdByName || "",
      createdByPosition: data.createdByPosition || "",
      approvedByName: data.approvedByName || "",
      approvedByPosition: data.approvedByPosition || "",
      recievedByName: data.receivedByName || "",
      recievedByPosition: data.receivedByPosition || "",
      recievedDate: data.receivedDate || "",
    };

    const ref = await db.collection("borang_c6").add(recordData);
    return NextResponse.json({ success: true, record: { id: ref.id, ...recordData }, orderNumber });

  } catch (error) {
    console.error("Borang C6 POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helpers
async function getNextOrderNumber(db) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const startOfMonth = new Date(year, today.getMonth(), 1).toISOString();
  const endOfMonth = new Date(year, today.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const snap = await db.collection("borang_c6")
    .where("orderDate", ">=", startOfMonth)
    .where("orderDate", "<=", endOfMonth)
    .get();

  const nextValue = snap.size + 1;
  const sequence = String(nextValue).padStart(3, '0');
  return `C6-${year}-${month}-${sequence}`;
}

async function generateAndIncrementOrderNumber(db) {
  // Same logic — Firestore count is source of truth, no separate counter needed
  return getNextOrderNumber(db);
}