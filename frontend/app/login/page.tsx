"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import API from "@/lib/api/axios"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [isLoggedIn] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("token")
    } catch {
      return false
    }
  })
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.resolve().then(() => setLoading(false))
  }, [])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await API.post("/auth/login", { email, password })
      const token = res.data.data.token
      localStorage.setItem("token", token)
      window.location.href = "/dashboard"
    } catch (err: unknown) {
      console.warn("Login error:", err)
      const error = err as { response?: { data?: { message?: string; error?: { message?: string } }; status?: number }; message?: string };
      let errorMessage = "Login failed. Please check your credentials or ensure the server is running.";
      if (!error.response) {
        // Network error (no response)
        errorMessage = `Network Error: Unable to reach backend at http://localhost:5050. Is the backend running?`;
      } else {
        errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || errorMessage;
      }
      console.warn("Backend response:", error.response?.data)
      setError(errorMessage)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking login status...</p>
        </div>
      </div>
    )
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">You are already signed in</h2>
          <p className="text-gray-600 mb-6">You are already signed into HealthSphere. Go to your dashboard or logout.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold">
              Dashboard
            </Link>
            <button
              onClick={() => { localStorage.removeItem("token"); window.location.href = "/" }}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">HS</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Welcome Back</h1>
        <p className="text-center text-gray-600 mb-8">Sign in to your HealthSphere account</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition placeholder-gray-400 bg-white text-sky-600"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition placeholder-gray-400 bg-white text-sky-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-600 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 font-semibold hover:text-blue-700">
            Sign up here
          </Link>
        </p>

        <div className="flex justify-center gap-4 mt-6 text-sm text-gray-600">
          <a href="#" className="hover:text-blue-600">Forgot Password?</a>
          <span>|</span>
          <Link href="/" className="hover:text-blue-600">Back to Home</Link>
        </div>
      </div>
    </div>
  )
}
