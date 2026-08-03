"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        if (data.session) {
          // Signed up and logged in right away.
          router.push("/dashboard");
          router.refresh();
        } else {
          // Email confirmation is turned on in Supabase.
          setInfo(
            "Account created! Check your email and click the confirmation link, then log in here."
          );
          setMode("login");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-2xl">
        🧾
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "login" ? "Log in to Bill ORC" : "Create your account"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">Password</span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            placeholder="At least 6 characters"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {loading
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Sign up"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
          setInfo(null);
        }}
        className="text-sm text-teal-700 underline-offset-4 hover:underline"
      >
        {mode === "login"
          ? "No account yet? Sign up"
          : "Already have an account? Log in"}
      </button>
    </main>
  );
}
