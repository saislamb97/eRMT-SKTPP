"use client";

import { useEffect, useState } from "react";
import Protected from "../../components/Protected";
import RoleProtected from "../../components/RoleProtected";
import NavBar from "../../components/NavBar";
import { db } from "../../lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { UserCheck, UserX, Clock, RefreshCw, Shield } from "lucide-react";

export default function AdminPortalPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadUsers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const pendingQuery = query(
        collection(db, "teachers"),
        where("verified", "==", false),
        orderBy("email")
      );
      const approvedQuery = query(
        collection(db, "teachers"),
        where("verified", "==", true),
        orderBy("email")
      );

      const [pendingSnap, approvedSnap] = await Promise.all([
        getDocs(pendingQuery),
        getDocs(approvedQuery),
      ]);

      setPendingUsers(pendingSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setApprovedUsers(approvedSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const approveUser = async (userId) => {
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, "teachers", userId), { verified: true });
      await loadUsers(true);
    } catch (err) {
      console.error("Failed to approve user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const rejectUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this registration?")) return;
    setActionLoading(userId);
    try {
      await deleteDoc(doc(db, "teachers", userId));
      await loadUsers(true);
    } catch (err) {
      console.error("Failed to reject user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const revokeUser = async (userId) => {
    if (!confirm("Revoke access for this user?")) return;
    setActionLoading(userId);
    try {
      await updateDoc(doc(db, "teachers", userId), { verified: false });
      await loadUsers(true);
    } catch (err) {
      console.error("Failed to revoke user:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Protected>
      <RoleProtected allowedRoles={["admin"]}>
        <NavBar />
        <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">

          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Shield className="text-purple-600" size={28} />
                Admin Portal
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage teacher registrations and approvals
              </p>
            </div>
            <button
              onClick={() => loadUsers(true)}
              disabled={refreshing}
              className="auth-btn auth-btn-small flex items-center gap-2"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* PENDING */}
          <div className="auth-glass rounded-xl p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Clock className="text-amber-500" size={20} />
              Pending Approvals
              {pendingUsers.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingUsers.length}
                </span>
              )}
            </h2>

            {loading ? (
              <div className="text-slate-500 py-8 text-center">Loading...</div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-slate-500 py-8 text-center">
                <UserCheck className="mx-auto mb-2 text-green-500" size={32} />
                No pending registrations
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-sm capitalize">
                        {user.role}
                      </span>
                      <button
                        onClick={() => approveUser(user.id)}
                        disabled={actionLoading === user.id}
                        className="auth-btn auth-btn-primary auth-btn-small flex items-center gap-1"
                      >
                        <UserCheck size={14} />
                        {actionLoading === user.id ? "..." : "Approve"}
                      </button>
                      <button
                        onClick={() => rejectUser(user.id)}
                        disabled={actionLoading === user.id}
                        className="auth-btn auth-btn-small flex items-center gap-1 text-red-600"
                      >
                        <UserX size={14} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* APPROVED */}
          <div className="auth-glass rounded-xl p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <UserCheck className="text-green-500" size={20} />
              Approved Users
              <span className="text-slate-400 text-sm font-normal">({approvedUsers.length})</span>
            </h2>

            {loading ? (
              <div className="text-slate-500 py-8 text-center">Loading...</div>
            ) : approvedUsers.length === 0 ? (
              <div className="text-slate-500 py-8 text-center">
                <UserX className="mx-auto mb-2" size={32} />
                No approved users yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-slate-500 text-left">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedUsers.map((user) => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-3 pr-4 font-medium">{user.name}</td>
                        <td className="py-3 pr-4 text-slate-600">{user.email}</td>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs capitalize">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => revokeUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="text-red-500 hover:underline text-xs"
                          >
                            {actionLoading === user.id ? "..." : "Revoke"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </RoleProtected>
    </Protected>
  );
}