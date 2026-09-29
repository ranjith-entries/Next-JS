"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type SubmitEvent } from "react";
import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type Todo = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

type Me = {
  sub: number;
  username: string;
  role: "USER" | "ADMIN";
};

export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([api<Me>("/auth/me"), api<Todo[]>("/todos")]).then(([user, list]) => {
      setMe(user);
      setTodos(list);
    });
  }, [router]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    const newTodo = await api<Todo>("/todos", { method: "POST", body: { title } });
    setTodos([...todos, newTodo]);
    setTitle("");
  }

  async function toggleTodo(todo: Todo) {
    const updated = await api<Todo>(`/todos/${todo.id}`, {
      method: "PATCH",
      body: { done: !todo.done },
    });
    setTodos(todos.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function deleteTodo(id: number) {
    await api(`/todos/${id}`, { method: "DELETE" });
    setTodos(todos.filter((t) => t.id !== id));
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <main className="mx-auto w-full max-w-md p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Todos</h1>
        {me && (
          <div className="flex items-center gap-3 text-sm">
            <span>
              {me.username}
              {me.role === "ADMIN" && " (admin)"}
            </span>
            {me.role === "ADMIN" && (
              <Link href="/admin" className="text-blue-600 hover:underline">
                All todos
              </Link>
            )}
            <button onClick={logout} className="text-blue-600 hover:underline">
              Log out
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
          Add
        </button>
      </form>

      <ul>
        {todos.map((todo) => (
          <li
            key={todo.id}
            onClick={() => toggleTodo(todo)}
            className="flex cursor-pointer items-center justify-between border-b py-2"
          >
            <span className={todo.done ? "text-gray-400 line-through" : ""}>
              {todo.done ? "✅" : "⬜"} {todo.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTodo(todo.id);
              }}
              className="px-2 text-red-500 hover:text-red-700"
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
