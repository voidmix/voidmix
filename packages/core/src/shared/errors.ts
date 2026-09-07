export type DomainErrorCode =
  | "USER_NOT_FOUND"
  | "SELF_SUSPENSION"
  | "LAST_ADMIN"
  | "EMAIL_ALREADY_EXISTS"
  | "BAD_REQUEST"
  | "MAIL_NOT_CONFIGURED";

/** Base class for errors raised by framework-independent business rules. */
export class DomainError<Code extends string = DomainErrorCode> extends Error {
  constructor(
    public readonly code: Code,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
