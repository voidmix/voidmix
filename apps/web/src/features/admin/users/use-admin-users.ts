import { useCallback, useEffect, useState } from "react";
import type { AdminUser, AdminUsersClient, UserRole, UserStatus } from "./client";

export function useAdminUsers(client: AdminUsersClient) {
  const [users, setUsers] = useState<readonly AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<UserStatus | undefined>();
  const [role, setRole] = useState<UserRole | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError(null);
    void client
      .listUsers({
        query,
        ...(status ? { status } : {}),
        ...(role ? { role } : {}),
      })
      .then((nextUsers) => {
        if (isCurrent) {
          setUsers(nextUsers);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setUsers([]);
          setError("The directory could not be loaded. Try again.");
          setIsLoading(false);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [client, query, reloadToken, role, status]);

  const toggleSuspension = useCallback(
    async (user: AdminUser) => {
      const nextStatus = user.status === "suspended" ? "active" : "suspended";
      const updated = await client.updateUserStatus({ userId: user.id, status: nextStatus });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    },
    [client],
  );

  return {
    users,
    query,
    setQuery,
    status,
    setStatus,
    role,
    setRole,
    isLoading,
    error,
    retry: () => setReloadToken((current) => current + 1),
    toggleSuspension,
  };
}
