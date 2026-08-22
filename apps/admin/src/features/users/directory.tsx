import { Button } from "@voidmix/ui/components/ui/button";
import { adminUsersClient } from "./client";
import { DirectoryToolbar } from "./directory-toolbar";
import { useAdminUsers } from "./use-admin-users";
import { UserTable } from "./user-table";

export function UserDirectory() {
  const usersState = useAdminUsers(adminUsersClient);

  return (
    <section className="directory-card">
      <DirectoryToolbar
        query={usersState.query}
        setQuery={usersState.setQuery}
        setStatus={usersState.setStatus}
        status={usersState.status}
      />
      <UserTable
        isLoading={usersState.isLoading}
        onToggle={(user) => void usersState.toggleSuspension(user)}
        users={usersState.users}
      />
      <footer className="table-footer">
        <span>Showing {usersState.users.length} of 2,416 users</span>
        <div>
          <Button disabled size="sm" variant="outline">
            Previous
          </Button>
          <Button size="sm" variant="outline">
            Next
          </Button>
        </div>
      </footer>
    </section>
  );
}
