'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, Award, TrendingUp, Send, X } from 'lucide-react';

interface SocialPost {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  type: 'achievement' | 'workout' | 'progress' | 'milestone' | 'general';
  image?: string;
  likes: number;
  comments: number;
  liked: boolean;
  createdAt: string;
  metadata?: {
    workoutType?: string;
    duration?: number;
    distance?: number;
    caloriesBurned?: number;
    achievement?: string;
    progressMetric?: string;
  };
}

export default function SocialFeed() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'achievement' | 'workout' | 'progress' | 'milestone' | 'general'>('general');
  const [postMetadata, setPostMetadata] = useState({
    workoutType: '',
    duration: '',
    distance: '',
    caloriesBurned: '',
  });
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, [filterType]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/community/feed?type=${filterType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      alert('Please write something for your post');
      return;
    }

    setPosting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          content: postContent,
          type: postType,
          metadata: postType !== 'general' ? postMetadata : {},
        }),
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts([newPost, ...posts]);
        setPostContent('');
        setPostType('general');
        setPostMetadata({ workoutType: '', duration: '', distance: '', caloriesBurned: '' });
        setShowPostModal(false);
      } else {
        alert('Failed to create post');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Error creating post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        setPosts(prev =>
          prev.map(post =>
            post.id === postId
              ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'achievement':
        return 'bg-yellow-50 border-yellow-200';
      case 'workout':
        return 'bg-blue-50 border-blue-200';
      case 'progress':
        return 'bg-indigo-50 border-indigo-200';
      case 'milestone':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <Award className="w-5 h-5 text-yellow-600" />;
      case 'workout':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'progress':
        return <TrendingUp className="w-5 h-5 text-indigo-600" />;
      case 'milestone':
        return <Award className="w-5 h-5 text-purple-600" />;
      default:
        return null;
    }
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return postDate.toLocaleDateString();
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading social feed...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Community Activity</h2>
        <p className="text-gray-600">See what your community is up to</p>
      </div>

      {/* Create Post Card */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
        <button
          onClick={() => setShowPostModal(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-600 rounded-lg hover:from-indigo-100 hover:to-purple-100 transition border border-indigo-200 text-left"
        >
          📝 Share your progress, achievement, or workout...
        </button>
      </div>

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Create a Post</h3>
              <button onClick={() => setShowPostModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Post Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Post Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { value: 'general' as const, label: '💬 General', icon: '💬' },
                    { value: 'achievement' as const, label: '🏆 Achievement', icon: '🏆' },
                    { value: 'workout' as const, label: '💪 Workout', icon: '💪' },
                    { value: 'progress' as const, label: '📈 Progress', icon: '📈' },
                    { value: 'milestone' as const, label: '⭐ Milestone', icon: '⭐' },
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setPostType(type.value)}
                      className={`p-3 rounded-lg border-2 transition text-center text-sm font-medium ${
                        postType === type.value
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Post Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What's on your mind?</label>
                <textarea
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  placeholder="Share your achievement, workout details, or progress update..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={5}
                />
              </div>

              {/* Metadata based on post type */}
              {postType === 'workout' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Workout Type</label>
                    <input
                      type="text"
                      placeholder="e.g., Running"
                      value={postMetadata.workoutType}
                      onChange={e => setPostMetadata({ ...postMetadata, workoutType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                    <input
                      type="number"
                      placeholder="30"
                      value={postMetadata.duration}
                      onChange={e => setPostMetadata({ ...postMetadata, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                    <input
                      type="text"
                      placeholder="5.2"
                      value={postMetadata.distance}
                      onChange={e => setPostMetadata({ ...postMetadata, distance: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Calories Burned</label>
                    <input
                      type="number"
                      placeholder="250"
                      value={postMetadata.caloriesBurned}
                      onChange={e => setPostMetadata({ ...postMetadata, caloriesBurned: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowPostModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={posting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'all', label: 'All' },
          { id: 'achievement', label: 'Achievements' },
          { id: 'workout', label: 'Workouts' },
          { id: 'milestone', label: 'Milestones' },
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setFilterType(filter.id)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterType === filter.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-4 max-w-2xl">
        {posts.length > 0 ? (
          posts.map(post => (
            <div
              key={post.id}
              className={`border rounded-lg overflow-hidden hover:shadow-md transition ${getPostTypeColor(post.type)}`}
            >
              {/* Post Header */}
              <div className="p-4 flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  {post.avatar ? (
                    <img src={post.avatar} alt={post.username} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{post.username}</h3>
                      {getPostTypeIcon(post.type)}
                      <span className="text-xs text-gray-500 capitalize">{post.type}</span>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-gray-800 leading-relaxed">{post.content}</p>

                {/* Metadata */}
                {post.metadata && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {post.metadata.workoutType && (
                      <div className="text-xs bg-white/50 px-2 py-1 rounded">
                        <span className="font-medium text-gray-700">{post.metadata.workoutType}</span>
                      </div>
                    )}
                    {post.metadata.duration && (
                      <div className="text-xs bg-white/50 px-2 py-1 rounded">
                        <span className="font-medium text-gray-700">{post.metadata.duration} mins</span>
                      </div>
                    )}
                    {post.metadata.distance && (
                      <div className="text-xs bg-white/50 px-2 py-1 rounded">
                        <span className="font-medium text-gray-700">{post.metadata.distance} km</span>
                      </div>
                    )}
                    {post.metadata.caloriesBurned && (
                      <div className="text-xs bg-white/50 px-2 py-1 rounded">
                        <span className="font-medium text-gray-700">{post.metadata.caloriesBurned} kcal</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Image */}
                {post.image && (
                  <img src={post.image} alt="Post" className="mt-3 rounded-lg w-full object-cover max-h-64" />
                )}
              </div>

              {/* Post Actions */}
              <div className="px-4 py-3 border-t border-gray-200 bg-white/50 flex items-center gap-4">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1 transition ${
                    post.liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">{post.likes}</span>
                </button>

                <button className="flex items-center gap-1 text-gray-600 hover:text-indigo-600 transition">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">{post.comments}</span>
                </button>

                <button className="flex items-center gap-1 text-gray-600 hover:text-green-600 transition ml-auto">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No posts in this feed</p>
          </div>
        )}
      </div>
    </div>
  );
}
