'use client';

import { X, Target, Users, Award, TrendingUp } from 'lucide-react';

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
}

interface ChallengeDetailsModalProps {
  challenge: Challenge;
  isJoined: boolean;
  onClose: () => void;
  onJoin: () => void;
  onLeave: () => void;
}

export default function ChallengeDetailsModal({
  challenge,
  isJoined,
  onClose,
  onJoin,
  onLeave,
}: ChallengeDetailsModalProps) {
  const daysRemaining = Math.ceil(
    (new Date(challenge.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-400 to-red-500 p-6 text-white sticky top-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold">{challenge.title}</h2>
              <p className="text-orange-100">{challenge.description}</p>
            </div>
            <button onClick={onClose} className="text-white hover:opacity-80">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 font-medium">Difficulty</div>
              <div className="text-lg font-bold text-gray-900 capitalize">{challenge.difficulty}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 font-medium">Participants</div>
              <div className="text-lg font-bold text-gray-900">{challenge.participants}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 font-medium">Days Left</div>
              <div className="text-lg font-bold text-orange-600">{daysRemaining}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600 font-medium">Category</div>
              <div className="text-lg font-bold text-gray-900 capitalize">{challenge.category}</div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Goal</h3>
                <p className="text-gray-600">{challenge.goal}</p>
              </div>
            </div>

            {challenge.prize && (
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">Prize</h3>
                  <p className="text-gray-600">{challenge.prize}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Challenge Period</h3>
                <p className="text-gray-600">
                  {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* User Progress */}
          {isJoined && challenge.yourProgress !== undefined && (
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-900">Your Progress</span>
                </div>
                <span className="text-2xl font-bold text-indigo-600">{challenge.yourProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all"
                  style={{ width: `${challenge.yourProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
            >
              Close
            </button>
            <button
              onClick={isJoined ? onLeave : onJoin}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                isJoined
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isJoined ? 'Leave Challenge' : 'Join Challenge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
