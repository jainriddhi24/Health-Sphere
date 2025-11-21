"use client";

import { useState } from "react";
import API from "@/lib/api/axios";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    try {
      const res = await API.post("/auth/login", { email, password });
  
      // THE CORRECT PLACE OF THE TOKEN:
      const token = res.data.data.token;
  
      console.log("TOKEN RECEIVED:", token);
  
      localStorage.setItem("token", token);
  
      alert("Login successful!");
      window.location.href = "/log-workout";
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  };  

  return (
    <div style={{ padding: 20 }}>
      <h1>Login</h1>

      <form onSubmit={submit}>
        <input
          placeholder="Email"
          style={{ display: "block", marginBottom: 10 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          style={{ display: "block", marginBottom: 10 }}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
