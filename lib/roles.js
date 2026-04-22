// Role-based access control helper

export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
  FINANCE: "finance",
  CANTEEN: "canteen",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Administrator",
  [ROLES.TEACHER]: "Teacher",
  [ROLES.FINANCE]: "Finance",
  [ROLES.CANTEEN]: "Canteen Operator",
};

// Check if user has specific role
export function hasRole(user, role) {
  return user?.role === role;
}

// Check if user has any of the specified roles
export function hasAnyRole(user, roles) {
  return roles.includes(user?.role);
}

// Check if user is admin
export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

// Check if user is teacher
export function isTeacher(user) {
  return user?.role === ROLES.TEACHER;
}

// Check if user is finance
export function isFinance(user) {
  return user?.role === ROLES.FINANCE;
}

// Check if user is canteen operator
export function isCanteen(user) {
  return user?.role === ROLES.CANTEEN;
}

// Get role display label
export function getRoleLabel(user) {
  return ROLE_LABELS[user?.role] || "Staff";
}

// Role-based page access
export const PAGE_ACCESS = {
  "/dashboard": [ROLES.ADMIN, ROLES.TEACHER, ROLES.FINANCE, ROLES.CANTEEN],
  "/attendance": [ROLES.ADMIN, ROLES.TEACHER],
  "/attendance/view": [ROLES.ADMIN, ROLES.TEACHER, ROLES.FINANCE],
  "/canteen": [ROLES.ADMIN, ROLES.CANTEEN],
  "/borang": [ROLES.ADMIN, ROLES.FINANCE],
  "/notifications": [ROLES.ADMIN, ROLES.TEACHER, ROLES.FINANCE, ROLES.CANTEEN],
  "/admin": [ROLES.ADMIN], // Admin portal - only admins can access
};

// Check if user can access a page
export function canAccessPage(user, pathname) {
  const allowedRoles = PAGE_ACCESS[pathname];
  if (!allowedRoles) return true; // No restrictions
  return allowedRoles.includes(user?.role);
}