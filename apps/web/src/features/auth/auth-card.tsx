import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@voidmix/ui/components/ui/card";
import { Logo } from "@voidmix/ui/logo";
import type { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  description: string;
  footer?: ReactNode;
  title: string;
}

export function AuthCard({ children, description, footer, title }: AuthCardProps) {
  return (
    <Card className="w-full max-w-sm gap-0 py-0 [--card-spacing:--spacing(6)]">
      <CardHeader className="gap-5 pt-(--card-spacing) pb-5">
        <Link
          aria-label="Voidmix home"
          className="w-fit rounded-lg text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          to="/"
        >
          <Logo className="text-sm" />
        </Link>
        <div className="space-y-1.5">
          <h1 className="text-xl leading-tight font-semibold tracking-tight text-balance">
            {title}
          </h1>
          <CardDescription className="text-[0.8125rem] leading-5 text-pretty">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pb-(--card-spacing)">{children}</CardContent>
      {footer ? (
        <CardFooter className="justify-center rounded-b-xl bg-muted/40 py-4 text-center text-[0.8125rem] text-muted-foreground">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
