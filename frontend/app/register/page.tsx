"use client";

import { useState } from "react";
import Link from "next/link";
import API from "@/lib/api/axios";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "other",
    height: "",
    weight: ""
  });
  const [loading, setLoading] = useState(false);
  const [isLoggedIn] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("token");
    } catch {
      return false;
    }
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // No immediate redirect: we'll show a friendly message if logged in

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.dateOfBirth || !formData.height || !formData.weight) {
      setError("Please fill in all required fields");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const calculateAge = (dateString: string): number => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const age = calculateAge(formData.dateOfBirth);
      
      await API.post("/auth/register", {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        age: age,
        gender: formData.gender,
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        chronic_condition: "none"
      });

      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err: unknown) {
      console.warn("Registration error:", err);
      const error = err as { response?: { data?: { message?: string; error?: { message?: string; details?: unknown } } } };
      const errorMessage = 
        error.response?.data?.error?.message || 
        error.response?.data?.message || 
        "Registration failed. Please try again.";
      console.warn("Backend response:", error.response?.data);
      setError(errorMessage);
      setLoading(false);
    }
  };

  // If user is already logged in, show a message with actions instead of the form
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">HS</span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">Join HealthSphere</h1>
        <p className="text-center text-gray-600 mb-6">Create your account and start your wellness journey</p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {success}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={submit} className="space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">First Name</label>
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sm placeholder-gray-400 bg-white text-sky-600"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Last Name</label>
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sm placeholder-gray-400 bg-white text-sky-600"
              />
            </div>
          </div>

          {/* Height & Weight Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Height (cm) *</label>
              <input
                type="number"
                name="height"
                placeholder="170"
                value={formData.height}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sm placeholder-gray-400 bg-white text-sky-600"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Weight (kg) *</label>
              <input
                type="number"
                name="weight"
                placeholder="70"
                value={formData.weight}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sm placeholder-gray-400 bg-white text-sky-600"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">Email Address *</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sm placeholder-gray-400 bg-white text-sky-600"
            />
          </div>

          {/* Date of Birth & Gender Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition text-sm placeholder-gray-400 text-sky-600"
              >
                <option value="male" className="text-gray-700">Male</option>
                <option value="female" className="text-gray-700">Female</option>
                <option value="other" className="text-gray-700">Other</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">Password *</label>
            <input
              type="password"
              name="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sm placeholder-gray-400 bg-white text-sky-600"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-700 font-semibold mb-1 text-sm">Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:bg-blue-50 transition text-sm placeholder-gray-400 bg-white text-sky-600"
            />
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-600">
            By signing up, you agree to our{" "}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and{" "}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        {/* Sign In Link */}
        <p className="text-center text-gray-600 mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
