import { Router } from 'express';
import {
  getGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  getChallenges,
  joinChallenge,
  leaveChallenge,
  updateProgress,
  getFeed,
  createPost,
  likePost,
  getLeaderboard,
  getStats,
} from '../controllers/community.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// ============= GROUPS =============
router.get('/groups', authMiddleware, getGroups);
router.post('/groups', authMiddleware, createGroup);
router.post('/groups/:groupId/join', authMiddleware, joinGroup);
router.post('/groups/:groupId/leave', authMiddleware, leaveGroup);

// ============= CHALLENGES =============
router.get('/challenges', authMiddleware, getChallenges);
router.post('/challenges/:challengeId/join', authMiddleware, joinChallenge);
router.post('/challenges/:challengeId/leave', authMiddleware, leaveChallenge);
router.post('/challenges/:challengeId/progress', authMiddleware, updateProgress);

// ============= SOCIAL POSTS =============
router.get('/feed', authMiddleware, getFeed);
router.post('/posts', authMiddleware, createPost);
router.post('/posts/:postId/like', authMiddleware, likePost);

// ============= LEADERBOARD & STATS =============
router.get('/leaderboard', authMiddleware, getLeaderboard);
router.get('/stats', authMiddleware, getStats);

export default router;

