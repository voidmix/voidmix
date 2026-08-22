import { useCallback, useEffect, useState } from "react";
import type { AdminUser, AdminUsersClient, UserStatus } from "./client";

export function useAdminUsers(client: AdminUsersClient) {
  const [users, setUsers] = useState<readonly AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<UserStatus | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    void client.listUsers({ query, ...(status ? { status } : {}) }).then((nextUsers) => {
      if (isCurrent) {
        setUsers(nextUsers);
        setIsLoading(false);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [client, query, status]);

  const toggleSuspension = useCallback(
    async (user: AdminUser) => {
      const nextStatus = user.status === "suspended" ? "active" : "suspended";
      const updated = await client.updateUserStatus({ userId: user.id, status: nextStatus });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    },
    [client],
  );

  return { users, query, setQuery, status, setStatus, isLoading, toggleSuspension };
}
