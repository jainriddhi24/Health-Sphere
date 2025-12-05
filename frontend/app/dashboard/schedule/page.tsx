"use client";

import { useState } from "react";
import Link from "next/link";
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';

interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  time: string;
}

export default function SchedulePage() {
  const [todos, setTodos] = useState<Todo[]>([
    {
      id: "1",
      title: "Morning Workout",
      description: "30 min cardio session",
      completed: false,
      time: "6:00 AM"
    },
    {
      id: "2",
      title: "Healthy Breakfast",
      description: "Oatmeal with fruits",
      completed: false,
      time: "7:30 AM"
    },
    {
      id: "3",
      title: "Hydration Break",
      description: "Drink 2 glasses of water",
      completed: false,
      time: "10:00 AM"
    },
    {
      id: "4",
      title: "Lunch",
      description: "Grilled chicken & vegetables",
      completed: false,
      time: "12:30 PM"
    },
    {
      id: "5",
      title: "Meditation",
      description: "10 min relaxation",
      completed: false,
      time: "3:00 PM"
    },
    {
      id: "6",
      title: "Evening Walk",
      description: "20 min outdoor walk",
      completed: false,
      time: "6:00 PM"
    }
  ]);

  const [newTodo, setNewTodo] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTime, setNewTime] = useState("");

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const todo: Todo = {
      id: Date.now().toString(),
      title: newTodo,
      description: newDescription,
      completed: false,
      time: newTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setTodos([...todos, todo]);
    setNewTodo("");
    setNewDescription("");
    setNewTime("");
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const completedCount = todos.filter(t => t.completed).length;
  const progress = Math.round((completedCount / todos.length) * 100) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <DashboardHeader title="Schedule" showBack={true} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-8 mb-8 shadow-lg">
          <h1 className="text-4xl font-bold mb-4">📅 Daily Schedule & To-Do List</h1>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold">{completedCount}/{todos.length}</div>
            <div className="flex-1">
              <div className="bg-blue-500 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-green-400 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-blue-100 mt-2">{progress}% tasks completed today</p>
            </div>
          </div>
        </div>

        {/* Add New Task */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Task</h2>
          <form onSubmit={addTodo} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Task Title *</label>
              <input
                type="text"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="e.g., Morning Yoga"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sky-600"
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="e.g., 30 min session"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sky-600"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Time</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sky-600"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              + Add Task
            </button>
          </form>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Today&apos;s Tasks</h2>
          <div className="space-y-3">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 transition ${
                  todo.completed
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200 hover:border-blue-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="mt-1 w-6 h-6 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`font-semibold text-lg ${
                        todo.completed ? "line-through text-gray-500" : "text-gray-900"
                      }`}
                    >
                      {todo.title}
                    </h3>
                    {todo.completed && (
                      <span className="text-green-600 text-xl">✓</span>
                    )}
                  </div>
                  {todo.description && (
                    <p className={`text-sm mt-1 ${
                      todo.completed ? "text-gray-400" : "text-gray-600"
                    }`}>
                      {todo.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">🕐 {todo.time}</p>
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="text-red-600 hover:text-red-700 font-bold text-lg"
                >
                  ✕
                </button>
              </div>
            ))}
            {todos.length === 0 && (
              <p className="text-center text-gray-500 py-8">No tasks yet. Add one to get started!</p>
            )}
          </div>
        </div>
      </div>
      <DashboardFooter />
    </div>
  );
}
