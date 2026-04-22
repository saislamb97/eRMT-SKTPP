"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import "../special.css";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center p-6">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="auth-welcome mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-6">
          You don&apos;t have permission to access this page.
          This page is restricted to certain roles only.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="auth-btn pt-2 auth-btn-primary">
            Go to Dashboard
          </Link>
          <button onClick={() => router.back()} className="auth-btn-small auth-btn-outline">
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}