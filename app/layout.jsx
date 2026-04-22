"use client";

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="container-narrow py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
