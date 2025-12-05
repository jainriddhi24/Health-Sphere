import { Pool } from 'pg';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedDemoData() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding demo data for Community & Challenges...');

    // Get or create a demo user
    const userResult = await client.query(
      `SELECT id, email FROM users LIMIT 1`
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;
    console.log(`✅ Using user: ${userId} (${userEmail})`);

    // Generate JWT token for test user
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { userId, email: userEmail },
      jwtSecret,
      { expiresIn: '7d' }
    );
    console.log(`🔐 Generated JWT Token: ${token}`);
    console.log(`📝 Copy this token to browser localStorage: localStorage.setItem('token', '${token}')`);


    // Create demo groups
    const groupIds: string[] = [];
    const groups = [
      {
        name: 'Morning Runners Club',
        description: 'Join our community of early morning runners. Share your routes, tips, and motivation!',
        category: 'fitness',
        maxMembers: 50
      },
      {
        name: 'Healthy Eaters United',
        description: 'A supportive community focused on nutrition and healthy meal planning. Share recipes and tips!',
        category: 'nutrition',
        maxMembers: 100
      },
      {
        name: 'Wellness Warriors',
        description: 'Dedicated to holistic health - mind, body, and spirit. Join our supportive journey!',
        category: 'wellness',
        maxMembers: 75
      }
    ];

    for (const group of groups) {
      const result = await client.query(
        `INSERT INTO community_groups (name, description, category, max_members, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [group.name, group.description, group.category, group.maxMembers, userId]
      );
      groupIds.push(result.rows[0].id);
      console.log(`✅ Created group: ${group.name}`);
    }

    // Add user to groups
    for (const groupId of groupIds) {
      await client.query(
        `INSERT INTO community_group_members (group_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [groupId, userId]
      );
    }
    console.log(`✅ Added user to all groups`);

    // Ensure community_challenges has required columns for seeding (defensive)
    const tableExistsRes = await client.query(`SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'community_challenges');`);
    const tableExists = tableExistsRes.rows[0].exists;
    if (!tableExists) {
      console.log('⚠️  community_challenges table does not exist. Run the database initializer (`npm run init-db` or similar) before seeding.');
      return;
    }
    const ccColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'community_challenges';`);
    const ccExistingCols = new Set(ccColsRes.rows.map((r: any) => r.column_name));

    // Create demo challenges
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const challenges = [
      {
        title: '10K Run Challenge',
        description: 'Run a total of 10K this month. Track your progress and compete with friends!',
        category: 'fitness',
        difficulty: 'medium',
        goal: 'Complete 10K total distance',
        prize: '🏅 Digital Badge + 100 points',
        startDate: now,
        endDate: nextMonth
      },
      {
        title: 'Hydration Challenge',
        description: 'Drink 2L of water daily for 30 days. Better hydration, better health!',
        category: 'wellness',
        difficulty: 'easy',
        goal: 'Maintain daily hydration goal',
        prize: '💧 Wellness Warrior Badge + 50 points',
        startDate: now,
        endDate: nextMonth
      },
      {
        title: 'Healthy Meal Prep Master',
        description: 'Prepare healthy meals for the entire week. Meal prep like a pro!',
        category: 'nutrition',
        difficulty: 'hard',
        goal: 'Prep 7 healthy meals',
        prize: '🍽️ Chef Badge + 150 points',
        startDate: now,
        endDate: nextMonth
      }
    ];

    const hasDifficulty = ccExistingCols.has('difficulty');
    const hasCategory = ccExistingCols.has('category');
    const hasGoal = ccExistingCols.has('goal');
    const hasPrize = ccExistingCols.has('prize');
    const hasCreatedBy = ccExistingCols.has('created_by');

    for (const challenge of challenges) {
      const fields = ['title', 'description'];
      if (hasCategory) fields.push('category');
      if (hasDifficulty) fields.push('difficulty');
      if (hasGoal) fields.push('goal');
      if (hasPrize) fields.push('prize');
      fields.push('start_date', 'end_date');
      if (hasCreatedBy) fields.push('created_by');

      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `INSERT INTO community_challenges (${fields.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      const params: any[] = [
        challenge.title,
        challenge.description
      ];
      if (hasCategory) params.push(challenge.category);
      if (hasDifficulty) params.push(challenge.difficulty);
      if (hasGoal) params.push(challenge.goal);
      if (hasPrize) params.push(challenge.prize);
      params.push(challenge.startDate, challenge.endDate);
      if (hasCreatedBy) params.push(userId);

      await client.query(insertQuery, params);
      console.log(`✅ Created challenge: ${challenge.title}`);
    }

    // Create demo social posts
    const postTypes = ['general', 'achievement', 'workout', 'progress', 'milestone'];
    const postContents = [
      {
        type: 'workout',
        content: 'Just completed a 5K run this morning! Feeling energized and ready to tackle the day! 🏃‍♂️',
        metadata: { workoutType: 'running', duration: 30, distance: 5, calories: 450 }
      },
      {
        type: 'achievement',
        content: 'Reached 100 days of consistent workouts! Never thought I could do it, but here we are! 💪',
        metadata: { milestone: '100 days', streak: true }
      },
      {
        type: 'progress',
        content: 'Lost 5 lbs this month by focusing on nutrition and staying consistent. Progress over perfection!',
        metadata: { weight: 165, previous: 170 }
      },
      {
        type: 'general',
        content: 'Does anyone have good meal prep tips? Looking to start prepping for the week ahead!',
        metadata: { question: true }
      },
      {
        type: 'milestone',
        content: 'Just hit my goal weight! All the hard work paid off! 🎉',
        metadata: { goalAchieved: true, finalWeight: 160 }
      }
    ];

    for (const post of postContents) {
      await client.query(
        `INSERT INTO social_posts (user_id, content, post_type, metadata, likes_count, comments_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, post.content, post.type, JSON.stringify(post.metadata), Math.floor(Math.random() * 50), Math.floor(Math.random() * 10)]
      );
      console.log(`✅ Created ${post.type} post`);
    }

    console.log('✅ Demo data seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoData();
