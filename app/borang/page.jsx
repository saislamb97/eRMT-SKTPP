"use client";

import { useRouter } from "next/navigation";
import Protected from "../../components/Protected";
import NavBar from "../../components/NavBar";

export default function FormsPage() {
  const router = useRouter();

  const Card = ({ title, desc, emoji, path }) => (
    <button
      onClick={() => router.push(path)}
      className="
        auth-card auth-glass
        p-5
        w-full
        text-left
        transition
        hover:-translate-y-0.5
        hover:shadow-lg
        active:translate-y-0
      "
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl leading-none">{emoji}</div>

        <div className="flex-1">
          <div className="text-lg font-medium leading-tight">
            {title}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {desc}
          </div>
        </div>

        <div className="text-slate-400 text-xl">›</div>
      </div>
    </button>
  );

  return (
    <Protected>
      <NavBar />

      <div className="max-w-3xl mx-auto px-4">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="auth-welcome">Forms & Reports</h1>
          <p className="text-sm text-slate-600">
            Generate official documents and daily reports
          </p>
        </div>

        {/* CARDS */}
        <div className="space-y-4">
          <Card
            emoji="🧾"
            title="Invoice"
            desc="Generate billing and payment records"
            path="/borang/invoice"
          />

          <Card
            emoji="🍱"
            title="Borang C6"
            desc="Daily meal order for canteen submission"
            path="/borang/borangc6"
          />

          <Card
            emoji="📊"
            title="Borang C8"
            desc="Attendance and verification summary"
            path="/borang/borangc8"
          />
        </div>

        {/* FOOTER */}
        <div className="mt-6 text-xs text-slate-500 text-center">
          Tip: All reports can be reviewed, printed, or exported as PDF.
        </div>
      </div>
    </Protected>
  );
}
