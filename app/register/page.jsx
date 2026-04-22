"use client";

import "../special.css";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // 1) Create Firebase Auth user
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // 2) Save extra info to Firestore
      await setDoc(doc(db, "teachers", user.uid), {
        email,
        name,
        role,
        verified: false,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      });

      // 3) Send custom verification email through your API
      const verificationRes = await fetch("/api/send-verification-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
        }),
      });

      const verificationData = await verificationRes.json();

      if (!verificationRes.ok) {
        throw new Error(
          verificationData.error || "Failed to send verification email"
        );
      }

      // 4) Notify admin (non-blocking if it fails)
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "salehhassane@graduate.utm.my",
            subject: "New e-RMT Registration - Action Required",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">New User Registration</h2>
                <p>A new user has registered:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 12px 0; font-weight: bold; color: #666;">Name:</td>
                    <td style="padding: 12px 0;">${name}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 12px 0; font-weight: bold; color: #666;">Email:</td>
                    <td style="padding: 12px 0;">${email}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #E5E7EB;">
                    <td style="padding: 12px 0; font-weight: bold; color: #666;">Role:</td>
                    <td style="padding: 12px 0; text-transform: capitalize;">${role}</td>
                  </tr>
                </table>
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400E;"><strong>Action Required:</strong></p>
                  <p style="margin: 8px 0 0 0; color: #92400E;">
                    Please log in to the admin panel and set 'verified' to true for this user.
                  </p>
                </div>
              </div>
            `,
            text: `New user registration

Name: ${name}
Email: ${email}
Role: ${role}

Action required:
Please log in to the admin panel and set 'verified' to true for this user.`,
          }),
        });
      } catch (adminEmailError) {
        console.error("Admin email failed:", adminEmailError);
      }

      setMessage(
        "Registration successful. Please check your email and verify your account before logging in."
      );

      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        setError("This account already exists.");
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 flex flex-col items-center justify-start overflow-y-auto">
      <div className="w-full max-w-sm">
        <div className="mb-4 text-center">
          <div className="auth-avatar-wrap">
            <div className="auth-avatar">
              <img src="/logo.png" alt="ERMT logo" className="auth-avatar-logo" />
            </div>
          </div>
          <h1 className="auth-welcome">Registration</h1>
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
            <label className="auth-label">Name</label>
            <input
              className="auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="auth-label">Email</label>
            <input
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="auth-label">Role</label>
            <select
              className="auth-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="teacher">Teacher</option>
              <option value="finance">Finance</option>
              <option value="canteen">Canteen Operator</option>
            </select>
          </div>

          <div>
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="auth-label-small">Minimum 8 characters.</p>
          </div>

          <div>
            <label className="auth-label">Confirm Password</label>
            <input
              type="password"
              className="auth-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button className="auth-btn auth-btn-primary w-full" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <p className="auth-link mt-6 mb-4">
          <Link href="/login">Have an account? Login</Link>
        </p>

        <p className="text-center text-sm text-slate-500 mt-6 pb-4">
          e-RMT@Sekolah Kebangsaan Taman Putra Perdana
        </p>
      </div>
    </div>
  );
}