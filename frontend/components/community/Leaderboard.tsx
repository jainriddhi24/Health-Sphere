'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Medal, Target } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  category: string;
  change?: number;
  badge?: string;
}

export default function Leaderboard() {
  const [leaderboards, setLeaderboards] = useState<LeaderboardEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('overall');
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'overall', name: 'Overall', icon: Trophy },
    { id: 'steps', name: 'Steps', icon: Target },
    { id: 'workouts', name: 'Workouts', icon: TrendingUp },
    { id: 'nutrition', name: 'Nutrition Points', icon: Target },
    { id: 'weight-loss', name: 'Weight Loss', icon: Medal },
  ];

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedCategory]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/community/leaderboard?category=${selectedCategory}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        // Map backend 'name' field to 'username' for compatibility
        const mappedLeaderboard = (data.leaderboard || []).map((entry: any) => ({
          ...entry,
          username: entry.name || entry.username,
          userId: entry.id,
          score: entry.total_calories_burned || 0
        }));
        setLeaderboards(mappedLeaderboard);
        setUserRank(data.userRank || null);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading leaderboard...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Leaderboard
        </h2>
        <p className="text-gray-600">See where you stand in the community</p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(({ id, name, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedCategory(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
              selectedCategory === id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {name}
          </button>
        ))}
      </div>

      {/* Your Rank Card */}
      {userRank && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium mb-1">Your Position</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">#{userRank.rank}</span>
                <span className="text-xl">({userRank.score.toLocaleString()} points)</span>
              </div>
            </div>
            <div className="text-5xl">{getMedalIcon(userRank.rank)}</div>
          </div>
          {userRank.change !== undefined && (
            <div className={`mt-3 text-sm ${userRank.change > 0 ? 'text-green-200' : userRank.change < 0 ? 'text-red-200' : 'text-gray-200'}`}>
              {userRank.change > 0 ? '↑' : userRank.change < 0 ? '↓' : '→'} {Math.abs(userRank.change)} from last week
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700">Score</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Change</th>
            </tr>
          </thead>
          <tbody>
            {leaderboards.map((entry, index) => (
              <tr
                key={entry.userId}
                className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                  entry.userId === userRank?.userId ? 'bg-indigo-50' : ''
                }`}
              >
                {/* Rank */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">{getMedalIcon(entry.rank)}</span>
                  </div>
                </td>

                {/* User Info */}
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt={entry.username} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{entry.username}</span>
                    {entry.badge && <span className="text-sm font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{entry.badge}</span>}
                  </div>
                </td>

                {/* Score */}
                <td className="py-4 px-4 text-right">
                  <span className="text-lg font-bold text-gray-900">{entry.score.toLocaleString()}</span>
                </td>

                {/* Change */}
                <td className="py-4 px-4 text-center">
                  {entry.change !== undefined && (
                    <div className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      entry.change > 0 ? 'text-green-600' : entry.change < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {entry.change > 0 ? '↑' : entry.change < 0 ? '↓' : '→'} {Math.abs(entry.change)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leaderboards.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No leaderboard data available</p>
        </div>
      )}
    </div>
  );
}
