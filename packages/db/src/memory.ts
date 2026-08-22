import type {
  AuditEvent,
  User,
  UserListQuery,
  UserPage,
  UserRepository,
  UserStatus,
} from "@voidmix/domain";

export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, User>();
  readonly auditEvents: AuditEvent[] = [];

  constructor(seed: readonly User[] = []) {
    for (const user of seed) this.users.set(user.id, { ...user });
  }

  async list(query: UserListQuery): Promise<UserPage> {
    const normalizedQuery = query.query?.toLowerCase();
    const offset = query.cursor ? Number.parseInt(query.cursor, 10) || 0 : 0;
    const matches = [...this.users.values()]
      .filter(
        (user) =>
          !normalizedQuery ||
          user.email.toLowerCase().includes(normalizedQuery) ||
          user.displayName.toLowerCase().includes(normalizedQuery),
      )
      .sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id),
      );
    const items = matches.slice(offset, offset + query.limit);
    const nextOffset = offset + items.length;
    return {
      items: items.map((user) => ({ ...user })),
      total: matches.length,
      nextCursor: nextOffset < matches.length ? String(nextOffset) : null,
    };
  }

  async getById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    const user = [...this.users.values()].find(
      (candidate) => candidate.email.toLowerCase() === normalized,
    );
    return user ? { ...user } : null;
  }

  async countActiveAdministrators(): Promise<number> {
    return [...this.users.values()].filter(
      (user) => user.status === "active" && (user.role === "admin" || user.role === "owner"),
    ).length;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, { ...user, email: user.email.toLowerCase() });
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`Cannot update missing user ${id}`);
    const updated = { ...existing, status };
    this.users.set(id, updated);
    return { ...updated };
  }

  async appendAudit(event: AuditEvent): Promise<void> {
    this.auditEvents.push({ ...event, metadata: { ...event.metadata } });
  }

  async listAudit(limit: number): Promise<AuditEvent[]> {
    return [...this.auditEvents]
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() || right.id.localeCompare(left.id),
      )
      .slice(0, limit)
      .map((event) => ({ ...event, metadata: { ...event.metadata } }));
  }
}
