"use client";

import { reportError, authErrorMessage } from "@/lib/errors";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppLogo } from "@/components/brand";
import { IconArrowRight } from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
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
          reportError("auth.signin", error);
          setError(authErrorMessage(error));
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
          reportError("auth.signup", error);
          setError(authErrorMessage(error));
          return;
        }
        if (data.session) {
          // Signed up and logged in right away.
          router.push("/dashboard");
          router.refresh();
        } else {
          // Email confirmation is turned on in Supabase.
          setInfo(
            "สร้างบัญชีแล้ว — เปิดอีเมลแล้วกดลิงก์ยืนยัน จากนั้นกลับมาเข้าสู่ระบบที่นี่"
          );
          setMode("login");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className="flex min-h-screen flex-col bg-surface">
      <div className="shell flex h-16 shrink-0 items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-small text-ink-600 transition hover:text-ink-900"
        >
          <IconArrowRight className="h-4 w-4 rotate-180" />
          กลับหน้าแรก
        </Link>
      </div>

      <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center">
            <AppLogo className="h-14 w-14" />
            <h1 className="mt-5 text-h2 font-bold tracking-tight text-ink-900">
              {isLogin ? "เข้าสู่ระบบ" : "สร้างบัญชีร้าน"}
            </h1>
            <p className="mt-2 text-small text-ink-600">
              {isLogin
                ? "ยินดีต้อนรับกลับมา จดบิลรออยู่แล้ว"
                : "ใช้ฟรี เริ่มจดบิลใบแรกได้ทันที"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card mt-7 p-6 sm:p-7">
            <div>
              <label htmlFor="email" className="label">
                อีเมล
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
                placeholder="you@example.com"
              />
            </div>

            <div className="mt-5">
              <label htmlFor="password" className="label">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field"
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
              {!isLogin && (
                <p className="mt-2 text-caption text-ink-450">
                  ใช้อย่างน้อย 8 ตัวอักษร ผสมตัวเลขหรือสัญลักษณ์จะปลอดภัยขึ้น
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-small text-red-700"
              >
                {error}
              </p>
            )}
            {info && (
              <p
                role="status"
                className="mt-5 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-small text-brand-700"
              >
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-6 w-full py-3.5"
            >
              {loading ? "กำลังดำเนินการ…" : isLogin ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
            </button>
          </form>

          <p className="mt-6 text-center text-small text-ink-600">
            {isLogin ? "ยังไม่มีบัญชี?" : "มีบัญชีอยู่แล้ว?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(isLogin ? "signup" : "login");
                setError(null);
                setInfo(null);
              }}
              className="font-semibold text-brand-600 underline-offset-4 hover:underline"
            >
              {isLogin ? "สมัครใช้งาน" : "เข้าสู่ระบบ"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
