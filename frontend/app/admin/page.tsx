"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type AdminTodo = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
  userId: number;
  user: { id: number; username: string };
};

export default function AdminPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<AdminTodo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<AdminTodo[]>("/todos/all")
      .then(setTodos)
      .catch((err: Error) => setError(err.message));
  }, [router]);

  return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">All todos</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← My todos
        </Link>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {!error && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">Owner</th>
              <th className="py-2">Todo</th>
              <th className="py-2">Done</th>
            </tr>
          </thead>
          <tbody>
            {todos.map((todo) => (
              <tr key={todo.id} className="border-b">
                <td className="py-2">{todo.user.username}</td>
                <td className="py-2">{todo.title}</td>
                <td className="py-2">{todo.done ? "✅" : "⬜"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
