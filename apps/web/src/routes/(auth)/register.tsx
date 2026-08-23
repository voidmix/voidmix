import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "../../features/auth/auth-form";

export const Route = createFileRoute("/(auth)/register")({
  component: () => <AuthForm mode="register" />,
});
