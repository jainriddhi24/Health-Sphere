"use client";

import { useState } from "react";
import API from "@/lib/api/axios";

export default function LogWorkoutPage() {
  const [workoutType, setWorkoutType] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState("medium");
  const [calories, setCalories] = useState("");

  const submit = async () => {
    try {
      const res = await API.post("/workouts/log", {
        workout_type: workoutType,
        duration_minutes: Number(duration),
        intensity,
        calories_burned: Number(calories),
      });

      alert("Workout logged!");
      console.log(res.data);
    } catch (err) {
      alert("Failed to log workout");
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Log Workout</h1>

      <input
        style={{ display: "block", marginBottom: 10 }}
        placeholder="Workout type"
        value={workoutType}
        onChange={(e) => setWorkoutType(e.target.value)}
      />

      <input
        style={{ display: "block", marginBottom: 10 }}
        placeholder="Duration (minutes)"
        type="number"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
      />

      <select
        style={{ display: "block", marginBottom: 10 }}
        value={intensity}
        onChange={(e) => setIntensity(e.target.value)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <input
        style={{ display: "block", marginBottom: 10 }}
        placeholder="Calories burned"
        type="number"
        value={calories}
        onChange={(e) => setCalories(e.target.value)}
      />

      <button onClick={submit}>Submit</button>
    </div>
  );
}
