"use client";

import { useEffect, useState, type SubmitEvent } from "react"; // NEW: SubmitEvent

type Todo = {
  id: number;
  title: string;
  done: boolean;
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState(""); // NEW

  useEffect(() => {
    fetch("http://localhost:4000/todos")
      .then((res) => res.json())
      .then((data) => setTodos(data));
  }, []);

  // NEW
  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    const res = await fetch("http://localhost:4000/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const newTodo: Todo = await res.json();

    setTodos([...todos, newTodo]);
    setTitle("");
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-bold">My Todos</h1>

      {/* NEW */}
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

  async function toggleTodo(todo: Todo) {
    const res = await fetch(`http://localhost:4000/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
    const updated: Todo = await res.json();

    setTodos(todos.map((t) => (t.id === updated.id ? updated : t)));
  }

   async function deleteTodo(id: number) {
    const res = await fetch(`http://localhost:4000/todos/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;

    setTodos(todos.filter((t) => t.id !== id));
  }
}