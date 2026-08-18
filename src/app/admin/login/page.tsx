"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandMark from "@/components/shared/BrandMark";
import Button from "@/components/shared/Button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";

  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({ error: "Login failed" }));
      setError(body.error ?? "Login failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm">
        <BrandMark />
        <h1 className="mt-6 text-center font-display text-2xl font-semibold text-navy-900">Admin Access</h1>
        <p className="mt-2 text-center text-sm text-ink-600">Enter the event passcode to continue.</p>

        <form onSubmit={handleSubmit} className="mt-8">
          <input
            type="password"
            inputMode="text"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3.5 text-base text-navy-900 shadow-card focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
          />
          {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
          <Button
            type="submit"
            variant="gold"
            disabled={submitting || passcode.length === 0}
            className="mt-4 w-full text-base"
          >
            {submitting ? "Checking…" : "Enter"}
          </Button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
