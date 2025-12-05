'use client';

import { useState, useEffect } from 'react';
import { Flame, Target, Users, Calendar, Award } from 'lucide-react';
import ChallengeDetailsModal from './ChallengeDetailsModal';

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  participants: number;
  goal: string;
  prize?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  yourProgress?: number;
  joined: boolean;
}

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [joinedChallenges, setJoinedChallenges] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/community/challenges', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
        setJoinedChallenges(new Set(data.joinedChallengeIds || []));
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/community/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        setJoinedChallenges(prev => new Set([...prev, challengeId]));
        setChallenges(prev =>
          prev.map(c =>
            c.id === challengeId
              ? { ...c, participants: c.participants + 1, joined: true }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Failed to join challenge:', error);
    }
  };

  const handleLeaveChallenge = async (challengeId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/community/challenges/${challengeId}/leave`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        setJoinedChallenges(prev => {
          const updated = new Set(prev);
          updated.delete(challengeId);
          return updated;
        });
        setChallenges(prev =>
          prev.map(c =>
            c.id === challengeId
              ? { ...c, participants: c.participants - 1, joined: false }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Failed to leave challenge:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredChallenges = challenges.filter(
    c => filterDifficulty === 'all' || c.difficulty === filterDifficulty
  );

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading challenges...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Active Challenges</h2>
        <p className="text-gray-600">Push yourself and compete with the community</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'easy', 'medium', 'hard'].map(difficulty => (
          <button
            key={difficulty}
            onClick={() => setFilterDifficulty(difficulty)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterDifficulty === difficulty
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {difficulty === 'all' ? 'All Levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </button>
        ))}
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredChallenges.length > 0 ? (
          filteredChallenges.map(challenge => {
            const isJoined = joinedChallenges.has(challenge.id);
            return (
              <div
                key={challenge.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition hover:border-indigo-300"
              >
                {/* Challenge Header */}
                <div className="bg-gradient-to-r from-orange-400 to-red-500 p-4 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold">{challenge.title}</h3>
                    <Flame className="w-5 h-5 flex-shrink-0" />
                  </div>
                  <p className="text-orange-100 text-sm mb-3">{challenge.description}</p>
                  <div className="flex gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty.toUpperCase()}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 bg-white/20 rounded">
                      {challenge.category}
                    </span>
                  </div>
                </div>

                {/* Challenge Info */}
                <div className="p-4 space-y-3">
                  {/* Goal */}
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span className="text-gray-700">{challenge.goal}</span>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-gray-700">
                      {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="text-gray-700">{challenge.participants} participants</span>
                  </div>

                  {/* Prize */}
                  {challenge.prize && (
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-yellow-600" />
                      <span className="text-gray-700">{challenge.prize}</span>
                    </div>
                  )}

                  {/* Progress Bar (if joined) */}
                  {isJoined && challenge.yourProgress !== undefined && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Your Progress</span>
                        <span className="text-sm font-bold text-indigo-600">{challenge.yourProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all"
                          style={{ width: `${challenge.yourProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => setSelectedChallenge(challenge)}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                    >
                      Details
                    </button>
                    <button
                      onClick={() =>
                        isJoined
                          ? handleLeaveChallenge(challenge.id)
                          : handleJoinChallenge(challenge.id)
                      }
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition ${
                        isJoined
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {isJoined ? 'Leave' : 'Join'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Flame className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No challenges available</p>
          </div>
        )}
      </div>

      {/* Challenge Details Modal */}
      {selectedChallenge && (
        <ChallengeDetailsModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          isJoined={joinedChallenges.has(selectedChallenge.id)}
          onJoin={() => handleJoinChallenge(selectedChallenge.id)}
          onLeave={() => handleLeaveChallenge(selectedChallenge.id)}
        />
      )}
    </div>
  );
}
