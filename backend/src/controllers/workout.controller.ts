import { Request, Response } from "express";
import pool from "../config/db";

// --------------------------------------------
// 1. Recommend Workouts (Public)
// --------------------------------------------
export const recommendWorkouts = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: [
      { workout_type: "Brisk Walk", duration: 30 },
      { workout_type: "Yoga", duration: 20 },
      { workout_type: "Cycling", duration: 25 },
    ],
  });
};

// --------------------------------------------
// 2. Log Workout (Requires Auth)
// --------------------------------------------
export const logWorkout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'NO_AUTH', message: 'Not authenticated' } });
    }

    const { workout_type, duration_minutes, intensity, calories_burned } = req.body;
    if (!workout_type || !duration_minutes) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'workout_type and duration_minutes are required' } });
    }

    const query = `
      INSERT INTO workouts (user_id, workout_type, duration_minutes, intensity, calories_burned)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [userId, workout_type, duration_minutes, intensity, calories_burned];

    const result = await pool.query(query, values);

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Failed to log workout" });
  }
};

// --------------------------------------------
// 3. Get Workout History
// --------------------------------------------
export const getHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const query = `
      SELECT * FROM workouts 
      WHERE user_id = $1 
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [userId, limit]);

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Failed to get history" });
  }
};

// --------------------------------------------
// 4. Get Workouts By Intensity
// --------------------------------------------
export const getByIntensity = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const level = req.query.level;

    if (!level)
      return res.status(400).json({ success: false, error: "Intensity level is required" });

    const query = `
      SELECT * FROM workouts
      WHERE user_id = $1 AND intensity = $2
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [userId, level]);

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Failed to filter workouts" });
  }
};

// --------------------------------------------
// 5. Search Workouts by Type Substring
// --------------------------------------------
export const getByTypeSubstring = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const queryText = req.query.query;

    if (!queryText)
      return res.status(400).json({ success: false, error: "Search query is required" });

    const query = `
      SELECT * FROM workouts
      WHERE user_id = $1 
      AND workout_type ILIKE $2
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [userId, `%${queryText}%`]);

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Search failed" });
  }
};

// --------------------------------------------
// 6. Workout Stats (SUM, COUNT, WEEKLY, ETC.)
// --------------------------------------------
export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const totalCaloriesQuery = `
      SELECT COALESCE(SUM(calories_burned), 0) AS total_calories
      FROM workouts WHERE user_id = $1;
    `;

    const weeklyWorkoutsQuery = `
      SELECT COUNT(*) AS weekly_workouts
      FROM workouts
      WHERE user_id = $1
      AND created_at >= NOW() - INTERVAL '7 days';
    `;

    const totalWorkoutsQuery = `
      SELECT COUNT(*) AS total_workouts
      FROM workouts WHERE user_id = $1;
    `;

    const avgDurationQuery = `
      SELECT COALESCE(AVG(duration_minutes), 0) AS avg_duration
      FROM workouts WHERE user_id = $1;
    `;

    const [totalCalories, weekly, total, avg] = await Promise.all([
      pool.query(totalCaloriesQuery, [userId]),
      pool.query(weeklyWorkoutsQuery, [userId]),
      pool.query(totalWorkoutsQuery, [userId]),
      pool.query(avgDurationQuery, [userId])
    ]);

    return res.json({
      success: true,
      data: {
        totalCalories: totalCalories.rows[0].total_calories,
        weeklyWorkouts: weekly.rows[0].weekly_workouts,
        totalWorkouts: total.rows[0].total_workouts,
        avgDuration: avg.rows[0].avg_duration
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Failed to calculate stats" });
  }
};
