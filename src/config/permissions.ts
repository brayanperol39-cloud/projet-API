export type Role = "SUPER_ADMIN" | "ADMIN" | "AGENT" | "USER";

export const PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ["user:create:admin", "user:create:user", "user:read", "user:update", "employee:manage"],
  ADMIN:       ["user:create:user", "user:read", "user:update", "employee:manage"],
  AGENT:       [],
  USER:        [],
};
