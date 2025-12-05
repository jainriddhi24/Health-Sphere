import { Request, Response } from 'express';
import pool from '../config/db';

// ============= GROUPS =============

export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const query = `
      SELECT 
        cg.id,
        cg.name,
        cg.description,
        cg.category,
        cg.max_members,
        cg.image_url,
        cg.created_at,
        COUNT(DISTINCT cgm.user_id) as members,
        CASE WHEN EXISTS (SELECT 1 FROM community_group_members WHERE group_id = cg.id AND user_id = $1) THEN true ELSE false END as joined
      FROM community_groups cg
      LEFT JOIN community_group_members cgm ON cg.id = cgm.group_id
      GROUP BY cg.id
      ORDER BY cg.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.json({
      success: true,
      groups: result.rows,
      joinedGroupIds: result.rows.filter((g: any) => g.joined).map((g: any) => g.id),
    });
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch groups' });
  }
};

export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, description, category, maxMembers } = req.body;

    if (!name || !description) {
      res.status(400).json({ success: false, error: 'Name and description required' });
      return;
    }

    const query = `
      INSERT INTO community_groups (name, description, category, max_members, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, category || 'fitness', maxMembers || null, userId]);
    const newGroup = result.rows[0];

    // Add creator to group members
    await pool.query(
      `INSERT INTO community_group_members (group_id, user_id) VALUES ($1, $2)`,
      [newGroup.id, userId]
    );

    res.status(201).json({
      success: true,
      id: newGroup.id,
      name: newGroup.name,
      description: newGroup.description,
      category: newGroup.category,
      members: 1,
      joined: true,
    });
  } catch (error) {
    console.error('Failed to create group:', error);
    res.status(500).json({ success: false, error: 'Failed to create group' });
  }
};

export const joinGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { groupId } = req.params;

    const query = `
      INSERT INTO community_group_members (group_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `;
    await pool.query(query, [groupId, userId]);

    res.json({ success: true, message: 'Joined group' });
  } catch (error) {
    console.error('Failed to join group:', error);
    res.status(500).json({ success: false, error: 'Failed to join group' });
  }
};

export const leaveGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { groupId } = req.params;

    await pool.query(
      `DELETE FROM community_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    res.json({ success: true, message: 'Left group' });
  } catch (error) {
    console.error('Failed to leave group:', error);
    res.status(500).json({ success: false, error: 'Failed to leave group' });
  }
};

// ============= CHALLENGES =============

export const getChallenges = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const query = `
      SELECT 
        cc.id,
        cc.title,
        cc.description,
        cc.category,
        cc.difficulty,
        cc.goal,
        cc.prize,
        cc.start_date,
        cc.end_date,
        COUNT(DISTINCT cp.user_id) as participants,
        COALESCE((SELECT progress_metric FROM challenge_participants WHERE challenge_id = cc.id AND user_id = $1), 0) as yourProgress,
        CASE WHEN (SELECT user_id FROM challenge_participants WHERE challenge_id = cc.id AND user_id = $1) IS NOT NULL THEN true ELSE false END as joined
      FROM community_challenges cc
      LEFT JOIN challenge_participants cp ON cc.id = cp.challenge_id
      GROUP BY cc.id
      ORDER BY cc.start_date DESC
    `;
    const result = await pool.query(query, [userId]);
    res.json({
      success: true,
      challenges: result.rows,
      joinedChallengeIds: result.rows.filter((c: any) => c.joined).map((c: any) => c.id),
    });
  } catch (error) {
    console.error('Failed to fetch challenges:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch challenges' });
  }
};

export const joinChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { challengeId } = req.params;

    await pool.query(
      `INSERT INTO challenge_participants (challenge_id, user_id, progress_metric) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
      [challengeId, userId]
    );

    res.json({ success: true, message: 'Joined challenge' });
  } catch (error) {
    console.error('Failed to join challenge:', error);
    res.status(500).json({ success: false, error: 'Failed to join challenge' });
  }
};

export const leaveChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { challengeId } = req.params;

    await pool.query(
      `DELETE FROM challenge_participants WHERE challenge_id = $1 AND user_id = $2`,
      [challengeId, userId]
    );

    res.json({ success: true, message: 'Left challenge' });
  } catch (error) {
    console.error('Failed to leave challenge:', error);
    res.status(500).json({ success: false, error: 'Failed to leave challenge' });
  }
};

export const updateProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { challengeId } = req.params;
    const { progressMetric } = req.body;

    if (progressMetric === undefined) {
      res.status(400).json({ success: false, error: 'Progress metric required' });
      return;
    }

    const query = `
      UPDATE challenge_participants 
      SET progress_metric = $1, updated_at = CURRENT_TIMESTAMP
      WHERE challenge_id = $2 AND user_id = $3
      RETURNING *
    `;
    await pool.query(query, [progressMetric, challengeId, userId]);

    res.json({ success: true, message: 'Progress updated' });
  } catch (error) {
    console.error('Failed to update progress:', error);
    res.status(500).json({ success: false, error: 'Failed to update progress' });
  }
};

// ============= SOCIAL POSTS =============

export const getFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { type } = req.query;

    let query = `
      SELECT 
        sp.id,
        sp.user_id,
        u.name as username,
        sp.content,
        sp.post_type as type,
        sp.metadata,
        sp.image_url as image,
        sp.likes_count as likes,
        sp.comments_count as comments,
        sp.created_at,
        CASE WHEN EXISTS (SELECT 1 FROM social_post_likes WHERE post_id = sp.id AND user_id = $1) THEN true ELSE false END as liked
      FROM social_posts sp
      JOIN users u ON sp.user_id = u.id
    `;

    const params: any[] = [userId];

    if (type && type !== 'all') {
      query += ` WHERE sp.post_type = $2`;
      params.push(type);
    }

    query += ` ORDER BY sp.created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    res.json({ success: true, posts: result.rows });
  } catch (error) {
    console.error('Failed to fetch feed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feed' });
  }
};

export const createPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { content, postType, metadata } = req.body;

    if (!content) {
      res.status(400).json({ success: false, error: 'Content required' });
      return;
    }

    const query = `
      INSERT INTO social_posts (user_id, content, post_type, metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING id, content, post_type as type, metadata, created_at
    `;
    const result = await pool.query(query, [userId, content, postType || 'general', metadata || {}]);

    const post = result.rows[0];

    // Get user info
    const userResult = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
    const username = userResult.rows[0]?.name || 'User';

    res.status(201).json({
      id: post.id,
      userId,
      username,
      content: post.content,
      type: post.type,
      metadata: post.metadata,
      likes: 0,
      comments: 0,
      liked: false,
      createdAt: post.created_at,
    });
  } catch (error) {
    console.error('Failed to create post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
};

export const likePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { postId } = req.params;

    // Check if already liked
    const checkQuery = `SELECT id FROM social_post_likes WHERE post_id = $1 AND user_id = $2`;
    const checkResult = await pool.query(checkQuery, [postId, userId]);

    if (checkResult.rows.length > 0) {
      // Unlike
      await pool.query(`DELETE FROM social_post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      await pool.query(
        `UPDATE social_posts SET likes_count = likes_count - 1 WHERE id = $1`,
        [postId]
      );
    } else {
      // Like
      await pool.query(`INSERT INTO social_post_likes (post_id, user_id) VALUES ($1, $2)`, [postId, userId]);
      await pool.query(
        `UPDATE social_posts SET likes_count = likes_count + 1 WHERE id = $1`,
        [postId]
      );
    }

    res.json({ success: true, message: 'Post liked/unliked' });
  } catch (error) {
    console.error('Failed to like post:', error);
    res.status(500).json({ success: false, error: 'Failed to like post' });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;

    let query = `
      SELECT 
        u.id,
        u.name,
        COUNT(DISTINCT w.id) as workouts,
        COUNT(DISTINCT CASE WHEN m.created_at >= NOW() - INTERVAL '7 days' THEN m.id END) as weekly_meals,
        COALESCE(SUM(w.calories_burned), 0) as total_calories_burned
      FROM users u
      LEFT JOIN workouts w ON u.id = w.user_id
      LEFT JOIN meals m ON u.id = m.user_id
    `;

    if (category === 'steps') {
      query += ` LEFT JOIN (SELECT user_id, COUNT(*) as step_count FROM workouts WHERE workout_type = 'walking' GROUP BY user_id) steps ON u.id = steps.user_id
        GROUP BY u.id, u.name
        ORDER BY step_count DESC`;
    } else if (category === 'workouts') {
      query += ` GROUP BY u.id, u.name
        ORDER BY workouts DESC`;
    } else {
      query += ` GROUP BY u.id, u.name
        ORDER BY total_calories_burned DESC`;
    }

    const result = await pool.query(query);
    const leaderboard = result.rows.map((row: any, index: number) => ({
      ...row,
      rank: index + 1,
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    const groupsQuery = `SELECT COUNT(*) FROM community_group_members WHERE user_id = $1`;
    const challengesQuery = `SELECT COUNT(*) FROM challenge_participants WHERE user_id = $1 AND progress_metric > 0`;
    const pointsQuery = `SELECT COALESCE(SUM(calories_burned), 0) as points FROM workouts WHERE user_id = $1`;

    const [groupsResult, challengesResult, pointsResult] = await Promise.all([
      pool.query(groupsQuery, [userId]),
      pool.query(challengesQuery, [userId]),
      pool.query(pointsQuery, [userId]),
    ]);

    res.json({
      success: true,
      groupsJoined: parseInt(groupsResult.rows[0].count),
      challengesActive: parseInt(challengesResult.rows[0].count),
      leaderboardRank: 1,
      totalPoints: parseInt(pointsResult.rows[0].points),
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

