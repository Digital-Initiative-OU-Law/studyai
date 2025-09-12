"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import BackButton from "@/components/BackButton";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await api.login(email, password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push("/role");
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <BackButton href="/" />
      <h1 className="text-2xl font-semibold mb-2">Login</h1>
      <p className="text-white/70 mb-6">Use your email and password to continue.</p>
      {error && <div className="card mb-4">{error}</div>}
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <label className="block mb-1 text-sm">Email</label>
          <input className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 text-sm">Password</label>
          <input className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <button className="btn" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
      </form>
    </main>
  );
}
