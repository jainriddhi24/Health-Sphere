'use client';

import { useState, useEffect } from 'react';
import { Users, Trophy, Flame, Share2 } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardFooter from '@/components/DashboardFooter';

// Components for each tab
import Groups from '@/components/community/Groups';
import Challenges from '@/components/community/Challenges';
import Leaderboard from '@/components/community/Leaderboard';
import SocialFeed from '@/components/community/SocialFeed';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'groups' | 'challenges' | 'leaderboard' | 'feed'>('groups');
  const [userStats, setUserStats] = useState({
    groupsJoined: 0,
    challengesActive: 0,
    leaderboardRank: 0,
    totalPoints: 0,
  });

  useEffect(() => {
    // Development mode: Set a test token if none exists
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      const testToken = process.env.NEXT_PUBLIC_TEST_TOKEN;
      if (testToken) {
        localStorage.setItem('token', testToken);
        console.log('✅ Test token loaded for development');
      }
    }

    // Fetch user community stats
    const fetchStats = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const response = await fetch('/api/community/stats', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setUserStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch community stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <DashboardHeader title="Community & Challenges" />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Community & Challenges</h1>
              <p className="text-gray-600">Connect, compete, and achieve together</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Groups Joined</p>
                  <p className="text-2xl font-bold text-indigo-600">{userStats.groupsJoined}</p>
                </div>
                <Users className="w-8 h-8 text-indigo-200" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Challenges</p>
                  <p className="text-2xl font-bold text-orange-600">{userStats.challengesActive}</p>
                </div>
                <Flame className="w-8 h-8 text-orange-200" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Leaderboard Rank</p>
                  <p className="text-2xl font-bold text-yellow-600">#{userStats.leaderboardRank}</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-200" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Points</p>
                  <p className="text-2xl font-bold text-purple-600">{userStats.totalPoints.toLocaleString()}</p>
                </div>
                <Flame className="w-8 h-8 text-purple-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-1 p-1">
            {[
              { id: 'groups', label: 'Groups', icon: Users },
              { id: 'challenges', label: 'Challenges', icon: Flame },
              { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
              { id: 'feed', label: 'Social Feed', icon: Share2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'groups' | 'challenges' | 'leaderboard' | 'feed')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'groups' && <Groups />}
          {activeTab === 'challenges' && <Challenges />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'feed' && <SocialFeed />}
        </div>
      </div>

      <DashboardFooter />
    </div>
  );
}
