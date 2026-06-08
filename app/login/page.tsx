import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-[100dvh] w-full max-w-full items-center justify-center overflow-x-hidden bg-[#05060d] px-4 py-6">
      <div className="shell-noise" />
      <AuthForm mode="login" />
    </main>
  );
}
