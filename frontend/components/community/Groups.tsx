'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Users, Plus, Search } from 'lucide-react';
import CreateGroupModal from './CreateGroupModal';

interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  members: number;
  maxMembers?: number;
  image?: string;
  joined: boolean;
  createdAt: string;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joinedGroups, setJoinedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/community/groups', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
        setJoinedGroups(new Set(data.joinedGroupIds || []));
      } else if (response.status === 401) {
        console.error('Unauthorized - token may be expired');
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/community/groups/${groupId}/join`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        setJoinedGroups(prev => new Set([...prev, groupId]));
        setGroups(prev =>
          prev.map(g => (g.id === groupId ? { ...g, members: g.members + 1, joined: true } : g))
        );
      }
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`/api/community/groups/${groupId}/leave`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        setJoinedGroups(prev => {
          const updated = new Set(prev);
          updated.delete(groupId);
          return updated;
        });
        setGroups(prev =>
          prev.map(g => (g.id === groupId ? { ...g, members: g.members - 1, joined: false } : g))
        );
      }
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const handleCreateGroup = async (groupData: { name: string; description: string; category: string; maxMembers?: number }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch('/api/community/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(groupData),
      });
      if (response.ok) {
        const newGroup = await response.json();
        setGroups(prev => [newGroup, ...prev]);
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const categories = ['all', 'fitness', 'nutrition', 'mental-health', 'weight-loss', 'marathon', 'wellness'];

  const filteredGroups = groups.filter(
    group =>
      (filterCategory === 'all' || group.category === filterCategory) &&
      group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading groups...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Groups</h2>
          <p className="text-gray-600">Join groups and connect with like-minded people</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat.replace('-', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length > 0 ? (
          filteredGroups.map(group => (
            <div
              key={group.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition hover:border-indigo-300"
            >
              {/* Group Header Image */}
              {group.image ? (
                <Image src={group.image} alt={group.name} width={400} height={128} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                  <Users className="w-12 h-12 text-white opacity-50" />
                </div>
              )}

              {/* Group Info */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-900 mb-1">{group.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{group.description}</p>

                {/* Category Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                    {group.category.replace('-', ' ')}
                  </span>
                </div>

                {/* Members Info */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {group.members} members {group.maxMembers && `/ ${group.maxMembers}`}
                    </span>
                  </div>
                </div>

                {/* Join/Leave Button */}
                <button
                  onClick={() =>
                    joinedGroups.has(group.id)
                      ? handleLeaveGroup(group.id)
                      : handleJoinGroup(group.id)
                  }
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    joinedGroups.has(group.id)
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {joinedGroups.has(group.id) ? 'Leave Group' : 'Join Group'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No groups found</p>
            <p className="text-gray-500 text-sm">Try adjusting your search or create a new group</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateGroup} />
      )}
    </div>
  );
}
