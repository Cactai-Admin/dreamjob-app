"use client";

// ── Admin Panel — Role-gated user management ──────────────

import { useState, useEffect } from "react";
import { Shield, Users, Search, MoveVertical as MoreVertical, UserCheck, UserX, Trash2, ChevronDown, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import type { AdminUser, UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  user:        { label: "User",        className: "bg-slate-100 text-slate-600 border-slate-200" },
  admin:       { label: "Admin",       className: "bg-sky-50 text-sky-700 border-sky-200" },
  super_admin: { label: "Super Admin", className: "bg-amber-50 text-amber-700 border-amber-200" },
};

const STATUS_CONFIG = {
  active:    { label: "Active",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  suspended: { label: "Suspended", className: "bg-red-50 text-red-600 border-red-200" },
  pending:   { label: "Pending",   className: "bg-amber-50 text-amber-600 border-amber-200" },
};

// Demo credentials shown to admins
const DEMO_ACCOUNTS = [
  { role: "User",        email: "user@jobassist.ai",       password: "test1234" },
  { role: "Admin",       email: "admin@jobassist.ai",      password: "test1234" },
  { role: "Super Admin", email: "superadmin@jobassist.ai", password: "MrZigs" },
];

type UserStatus = "active" | "suspended" | "pending";

export default function AdminPage() {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [search, setSearch]         = useState("");

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(data => {
      if (data.error) { setAccessError(data.error); return; }
      if (Array.isArray(data)) {
        // Map raw accounts to AdminUser shape
        const mapped: AdminUser[] = data.map((a: Record<string, unknown>) => {
          const roles = (a.account_roles as Array<{ role: string; is_active: boolean }>) ?? [];
          const topRole = roles.find(r => r.role === "super_admin")?.role
            ?? roles.find(r => r.role === "admin")?.role
            ?? "user";
          return {
            id: a.id as string,
            firstName: (a.first_name as string) ?? "",
            lastName: (a.last_name as string) ?? "",
            email: (a.email as string) ?? "",
            role: topRole as UserRole,
            status: "active",
            joinedAt: (a.created_at as string) ?? "",
            lastActive: "",
            applicationCount: 0,
            avatar: "",
          };
        });
        setUsers(mapped);
      }
    }).catch(() => setAccessError("Could not load admin data."));
  }, []);
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchSearch =
      `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const toggleStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "active" ? "suspended" : "active" }
          : u
      )
    );
    setOpenMenuId(null);
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setOpenMenuId(null);
  };

  const stats = {
    total:     users.length,
    active:    users.filter((u) => u.status === "active").length,
    suspended: users.filter((u) => u.status === "suspended").length,
    pending:   users.filter((u) => u.status === "pending").length,
  };

  if (accessError) {
    return (
      <div className="page-wrapper max-w-1000px">
        <div className="card-base p-8 text-center">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-700 mb-1">Access Denied</h2>
          <p className="text-slate-400 text-sm">{accessError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-1000px">
      <PageHeader
        title="Admin Panel"
        subtitle="User management and system overview"
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300 px-3 py-1.5 rounded-full">
              <Shield className="w-3 h-3" />
              Super Admin
            </span>
          </div>
        }
      />

      {/* Demo accounts */}
      <div className="card-base p-4 mb-5 bg-slate-900 border-slate-800">
        <p className="section-label text-slate-500 mb-3">Demo Accounts</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {DEMO_ACCOUNTS.map(({ role, email, password }) => (
            <div key={role} className="bg-slate-800/60 rounded-lg p-3">
              <div className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-1">{role}</div>
              <div className="text-slate-200 text-xs font-medium">{email}</div>
              <div className="text-slate-400 text-xs font-mono mt-0.5">{password}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Users",  value: stats.total,     icon: Users,     color: "text-sky-600",     bg: "bg-sky-50" },
          { label: "Active",       value: stats.active,    icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Suspended",    value: stats.suspended, icon: UserX,     color: "text-red-600",     bg: "bg-red-50" },
          { label: "Pending",      value: stats.pending,   icon: Activity,  color: "text-amber-600",   bg: "bg-amber-50" },
        ].map((stat) => (
          <div key={stat.label} className="card-base p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">{stat.label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 transition-all"
          />
        </div>
        <div className="relative">
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | "all")}
            className="appearance-none bg-white border border-slate-200 rounded-xl text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-300 text-slate-700"
          >
            <option value="all">All roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
            <option value="super_admin">Super Admins</option>
          </select>
        </div>
      </div>

      {/* User table / cards */}
      <div className="card-base overflow-visible">
        {/* Desktop table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50">
          <span className="section-label">User</span>
          <span className="section-label">Role</span>
          <span className="section-label">Status</span>
          <span className="section-label">Activity</span>
          <span className="section-label" />
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((user) => (
            <div
              key={user.id}
              className="flex sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 items-center px-4 sm:px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
            >
              {/* User info */}
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={user.avatar}
                  alt={user.firstName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 text-sm truncate">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-slate-400 text-xs truncate">{user.email}</div>
                </div>
              </div>

              {/* Role */}
              <div className="hidden sm:flex">
                <span className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border",
                  ROLE_CONFIG[user.role].className
                )}>
                  {ROLE_CONFIG[user.role].label}
                </span>
              </div>

              {/* Status */}
              <div className="hidden sm:flex">
                <span className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border",
                  STATUS_CONFIG[user.status].className
                )}>
                  {STATUS_CONFIG[user.status].label}
                </span>
              </div>

              {/* Activity */}
              <div className="hidden sm:block">
                <div className="text-xs text-slate-500">{user.applicationCount} apps</div>
                <div className="text-xs text-slate-400">Active {user.lastActive}</div>
              </div>

              {/* Actions menu */}
              <div className="relative ml-auto sm:ml-0">
                <button
                  onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {openMenuId === user.id && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden animate-slide-up">
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {user.status === "active" ? (
                        <><UserX className="w-3.5 h-3.5 text-red-500" /> Suspend user</>
                      ) : (
                        <><UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Reactivate</>
                      )}
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete user
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No users match your search.
          </div>
        )}
      </div>
    </div>
  );
}
