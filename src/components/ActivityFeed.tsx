'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, UserPlus, CheckCircle, Shield, Clock, User } from 'lucide-react';

type Activity = {
  id: string;
  activity_type: 'comment' | 'assignment' | 'resolution' | 'suppression' | 'false_positive' | 'status_change';
  entity_type: string;
  entity_id: string;
  metadata: any;
  created_at: string;
  user: {
    id: string;
    email: string;
  };
};

const ACTIVITY_CONFIG = {
  comment: {
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'commented'
  },
  assignment: {
    icon: UserPlus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'assigned'
  },
  resolution: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'resolved'
  },
  suppression: {
    icon: Shield,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    label: 'suppressed'
  },
  false_positive: {
    icon: Shield,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    label: 'marked as false positive'
  },
  status_change: {
    icon: Clock,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    label: 'changed status'
  }
};

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit] = useState(50);

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    try {
      const response = await fetch(`/api/team/activity?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  function getActivityMessage(activity: Activity): string {
    const config = ACTIVITY_CONFIG[activity.activity_type];
    const metadata = activity.metadata || {};

    switch (activity.activity_type) {
      case 'comment':
        return `${config.label} on issue`;
      case 'assignment':
        if (metadata.assigned_to) {
          return `${config.label} issue to team member`;
        }
        return 'unassigned issue';
      case 'resolution':
        return `${config.label} issue`;
      case 'suppression':
        return `${config.label} issue`;
      case 'false_positive':
        return config.label;
      case 'status_change':
        return `${config.label} to ${metadata.status}`;
      default:
        return 'performed action';
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <div className="text-slate-500">Loading activity...</div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <div className="text-slate-500 mb-2">No recent activity</div>
        <p className="text-sm text-slate-400">
          Team activity will appear here when members comment, assign, or resolve issues.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-100">
        {activities.map((activity) => {
          const config = ACTIVITY_CONFIG[activity.activity_type];
          const Icon = config.icon;

          return (
            <div key={activity.id} className="p-4 hover:bg-slate-50 transition">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${config.bgColor} shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900 text-sm">
                          {activity.user.email}
                        </span>
                        <span className="text-slate-500 text-sm">
                          {getActivityMessage(activity)}
                        </span>
                      </div>

                      {/* Activity metadata */}
                      {activity.metadata?.comment_preview && (
                        <p className="text-sm text-slate-600 italic line-clamp-2 mt-1">
                          "{activity.metadata.comment_preview}"
                        </p>
                      )}

                      {activity.metadata?.status && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                          {activity.metadata.status}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <time className="text-xs text-slate-400 shrink-0">
                      {formatTimeAgo(activity.created_at)}
                    </time>
                  </div>

                  {/* Link to entity */}
                  {activity.entity_type === 'issue_group' && (
                    <a
                      href={`/dashboard/issues/${activity.entity_id}`}
                      className="inline-block mt-2 text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      View issue →
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
