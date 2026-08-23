import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@voidmix/ui/components/ui/button";

export function AuthActions() {
  return (
    <nav aria-label="Account" className="flex items-center gap-1">
      <Link className={buttonVariants({ variant: "ghost" })} data-slot="button" to="/login">
        Log in
      </Link>
      <Link className={buttonVariants()} data-slot="button" to="/register">
        <span className="hidden min-[480px]:inline">Create account</span>
        <span className="min-[480px]:hidden">Sign up</span>
      </Link>
    </nav>
  );
}
