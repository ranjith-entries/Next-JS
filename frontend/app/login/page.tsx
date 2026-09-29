"use client";

import { useRouter } from "next/navigation";
import { useState, type SubmitEvent } from "react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const { access_token } = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: { username, password },
      });
      setToken(access_token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm p-8">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoComplete="username"
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="rounded border px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
          Log in
        </button>
      </form>
    </main>
  );
}
