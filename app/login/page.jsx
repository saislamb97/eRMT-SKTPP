"use client";

import "../special.css";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    searchParams.get("verified") === "1"
      ? "Your verification link was processed. Please log in."
      : ""
  );

  const handleResendVerification = async () => {
    setError("");
    setMessage("");

    if (!email || !password) {
      setError("Enter your email and password first to resend verification.");
      return;
    }

    setResending(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      if (user.emailVerified) {
        setMessage("Your email is already verified.");
        return;
      }

      const response = await fetch("/api/send-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification email.");
      }

      setMessage("A new verification email has been sent.");
      await signOut(auth);
    } catch (err) {
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      await user.reload();

      if (!auth.currentUser?.emailVerified) {
        await signOut(auth);
        throw new Error("Please verify your email first.");
      }

      const snap = await getDoc(doc(db, "teachers", user.uid));

      if (!snap.exists()) {
        await signOut(auth);
        throw new Error("Account not found.");
      }

      const data = snap.data();

      if (!data.verified) {
        await signOut(auth);
        throw new Error("Waiting for admin approval.");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-center overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="mb-4 text-center">
          <div className="auth-avatar-wrap">
            <div className="auth-avatar">
              <img src="/logo.png" alt="ERMT logo" className="auth-avatar-logo" />
            </div>
          </div>
          <h1 className="auth-welcome">Welcome,</h1>
        </div>

        <form onSubmit={onSubmit} className="auth-card auth-glass p-6 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <div>
            <label className="auth-label">Email</label>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <p className="auth-link">
            <Link href="/forgot-password">Forgot Password?</Link>
          </p>

          <button className="auth-btn auth-btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

          <button
            type="button"
            className="auth-btn w-full"
            onClick={handleResendVerification}
            disabled={resending || loading}
          >
            {resending ? "Sending..." : "Resend verification email"}
          </button>
        </form>

        <p className="auth-link mt-6 mb-4">
          <Link href="/register">No account? Register</Link>
        </p>

        <p className="text-center text-sm text-slate-500 mt-6 pb-4">
          e-RMT@Sekolah Kebangsaan Taman Putra Perdana
        </p>
      </div>
    </div>
  );
}