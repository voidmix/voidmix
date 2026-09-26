const mutationProcedureNames = new Set([
  "create",
  "updateStatus",
  "update",
  "commitVersion",
  "complete",
  "resolveConflict",
  "transition",
  "acquireLease",
  "heartbeat",
  "archive",
  "restore",
  "resolve",
  "cancel",
  "retry",
]);

/** GET reads may be batched; named mutations always use POST. */
export function isMutationProcedure(path: readonly string[]): boolean {
  return mutationProcedureNames.has(path.at(-1) ?? "");
}
