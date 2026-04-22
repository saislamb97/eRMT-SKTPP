"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Protected from "../../components/Protected";
import RoleProtected from "../../components/RoleProtected";
import NavBar from "../../components/NavBar";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";

export default function NotificationsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [dismissedPending, setDismissedPending] = useState(new Set());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "teachers", user.uid));
        if (snap.exists()) {
          const data = { id: user.uid, ...snap.data() };
          setCurrentUser(data);
          setIsAdmin(data.role === "admin");
          if (data.role === "admin") loadPendingUsers();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const snap = await getDocs(query(collection(db, "teachers"), where("verified", "==", false), orderBy("email")));
      setPendingUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load pending users:", err);
    }
  };

  const loadNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let q = query(collection(db, "notifications"), where("recipient", "==", currentUser.id), orderBy("created", "desc"));
      const snap = await getDocs(q);
      let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filter === "unread") notifs = notifs.filter(n => n.status === "unread");
      if (filter === "read") notifs = notifs.filter(n => n.status === "read");
      setNotifications(notifs);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotifications(); }, [filter, currentUser]);

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { status: "read" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: "read" } : n));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => n.status === "unread");
    for (const n of unread) await updateDoc(doc(db, "notifications", n.id), { status: "read" });
    setDismissedPending(new Set(pendingUsers.map(u => u.id)));
    setNotifications(prev => prev.map(n => ({ ...n, status: "read" })));
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this notification?")) return;
    await deleteDoc(doc(db, "notifications", id));
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleApprove = async (userId, userEmail, userName) => {
    try {
      await updateDoc(doc(db, "teachers", userId), { verified: true });
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userEmail,
          subject: 'Your e-RMT account has been approved',
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2>Account Approved!</h2><p>Hi ${userName}, your account has been approved. <a href="${window.location.origin}/login">Log in now</a>.</p></div>`
        })
      });
      await loadPendingUsers();
      router.push("/admin");
    } catch (err) {
      alert(`Failed to approve: ${err.message}`);
    }
  };

  const handleReject = async (userId, userEmail, userName) => {
    if (!confirm("Reject this registration?")) return;
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: userEmail,
          subject: 'Your e-RMT registration was not approved',
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><h2>Registration Not Approved</h2><p>Hi ${userName}, your registration was rejected. Please contact the school administration.</p></div>`
        })
      });
      await deleteDoc(doc(db, "teachers", userId));
      await loadPendingUsers();
    } catch (err) {
      alert(`Failed to reject: ${err.message}`);
    }
  };

  const filteredPendingUsers = filter === "unread" ? pendingUsers.filter(u => !dismissedPending.has(u.id))
    : filter === "read" ? pendingUsers.filter(u => dismissedPending.has(u.id))
    : pendingUsers;

  const unreadCount = notifications.filter(n => n.status === "unread").length;
  const unreadPendingCount = isAdmin ? pendingUsers.filter(u => !dismissedPending.has(u.id)).length : 0;

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin", "finance"]}>
        <NavBar />
        <div className="max-w-6xl mx-auto px-4">
          <div className="auth-card auth-glass p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="auth-welcome">Notifications</h1>
                <p className="text-sm text-slate-500 mt-1">{unreadCount + unreadPendingCount} unread</p>
              </div>
              {(unreadCount > 0 || unreadPendingCount > 0) && (
                <button onClick={markAllAsRead} className="auth-btn-small auth-btn-primary">Mark All Read</button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {["all", "unread", "read"].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm transition ${filter === f ? "bg-slate-900 text-white" : "bg-white/60 hover:bg-white border"}`}>
                  {f === "all" && "All"}
                  {f === "unread" && `Unread (${unreadCount + unreadPendingCount})`}
                  {f === "read" && "Read"}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {isAdmin && filteredPendingUsers.map(user => {
                const isUnread = !dismissedPending.has(user.id);
                return (
                  <div key={user.id} className={`auth-card p-4 rounded-xl ${isUnread ? "bg-amber-50 border border-amber-200" : "bg-white/70 border"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⚠️</span>
                          <h3 className="font-semibold">Registration Pending</h3>
                          {isUnread && <span className="px-2 py-0.5 text-xs bg-amber-600 text-white rounded-full">New</span>}
                        </div>
                        <p className="text-sm text-slate-700 mt-1">{user.name} is waiting for approval</p>
                        <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isUnread && <button onClick={() => setDismissedPending(prev => new Set([...prev, user.id]))} className="auth-btn-small auth-btn-primary">Mark Read</button>}
                        <button onClick={() => handleApprove(user.id, user.email, user.name)} className="auth-btn-small bg-green-600 text-white hover:bg-green-700">Approve</button>
                        <button onClick={() => handleReject(user.id, user.email, user.name)} className="auth-btn-small bg-red-600 text-white hover:bg-red-700">Reject</button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {notifications.map(notif => (
                <div key={notif.id} className={`auth-card p-4 rounded-xl ${notif.status === "unread" ? "bg-blue-50 border border-blue-200" : "bg-white/70 border"}`}>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{notif.type === "invoice" ? "📄" : notif.type === "system" ? "⚙️" : "⚠️"}</span>
                        <h3 className="font-semibold">{notif.title}</h3>
                        {notif.status === "unread" && <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">New</span>}
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{notif.message}</p>
                      <p className="text-xs text-slate-500 mt-2">{new Date(notif.created).toLocaleString("ms-MY")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-start">
                      {notif.status === "unread" && <button onClick={() => markAsRead(notif.id)} className="auth-btn-small auth-btn-primary">Mark Read</button>}
                      <button onClick={() => handleDelete(notif.id)} className="px-3 py-1.5 text-red-600 hover:bg-red-100 rounded text-sm">Delete</button>
                    </div>
                  </div>
                  {notif.type === "invoice" && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 text-sm items-center">
                      {notif.invoiceId && <button onClick={() => router.push(`/borang/invoice/${notif.invoiceId}`)} className="btn-outline">View Invoice</button>}
                      <button onClick={() => router.push("/borang/invoice/view")} className="btn-outline">View All Invoices</button>
                      {notif.amount && <span className="px-3 py-1 rounded bg-green-50 text-green-700">RM {notif.amount.toFixed(2)}</span>}
                      {notif.studentCount && <span className="px-3 py-1 rounded bg-blue-50 text-blue-700">{notif.studentCount} students</span>}
                    </div>
                  )}
                </div>
              ))}

              {!loading && notifications.length === 0 && filteredPendingUsers.length === 0 && (
                <div className="py-12 text-center text-slate-500">
                  <span className="text-5xl block mb-3">📭</span>
                  <p className="font-medium">No notifications</p>
                  <p className="text-sm mt-1">You're all caught up</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </RoleProtected>
    </Protected>
  );
}