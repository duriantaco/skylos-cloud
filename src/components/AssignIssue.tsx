'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserCircle, Users, Check, X } from 'lucide-react';

type Assignment = {
  id: string;
  assigned_to: string | null;
  assigned_by: string;
  status: 'assigned' | 'in_progress' | 'resolved' | 'unassigned';
  notes: string | null;
  assigned_at: string;
  assignee?: {
    id: string;
    email: string;
  };
  assigner?: {
    id: string;
    email: string;
  };
};

type OrgMember = {
  user_id: string;
  users: {
    id: string;
    email: string;
  };
};

type Props = {
  issueGroupId: string;
  orgId: string;
};

export default function AssignIssue({ issueGroupId, orgId }: Props) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchAssignment = useCallback(async () => {
    try {
      const response = await fetch(`/api/issue-groups/${issueGroupId}/assign`);
      if (!response.ok) throw new Error('Failed to fetch assignment');
      const data = await response.json();
      setAssignment(data.assignment);
    } catch (error: any) {
      console.error('Error fetching assignment:', error);
    } finally {
      setLoading(false);
    }
  }, [issueGroupId]);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/team/members?org_id=${orgId}`);
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error: any) {
      console.error('Error fetching members:', error);
    }
  }, [orgId]);

  useEffect(() => {
    fetchAssignment();
    fetchMembers();
  }, [fetchAssignment, fetchMembers]);

  async function handleAssign(userId: string | null) {
    setAssigning(true);
    setShowDropdown(false);

    try {
      const response = await fetch(`/api/issue-groups/${issueGroupId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_to: userId,
          status: userId ? 'assigned' : 'unassigned'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign');
      }

      const data = await response.json();
      setAssignment(data.assignment);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setAssigning(false);
    }
  }

  async function handleStatusChange(status: Assignment['status']) {
    setAssigning(true);

    try {
      const response = await fetch(`/api/issue-groups/${issueGroupId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      const data = await response.json();
      setAssignment(data.assignment);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <UserCircle className="w-4 h-4" />
        <span>Loading...</span>
      </div>
    );
  }

  const statusColors = {
    assigned: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    resolved: 'bg-green-50 text-green-700 border-green-200',
    unassigned: 'bg-slate-50 text-slate-600 border-slate-200'
  };

  return (
    <div className="flex items-center gap-3">
      {/* Assignment Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={assigning}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
        >
          <Users className="w-4 h-4" />
          {assignment?.assignee ? (
            <span>{assignment.assignee.email}</span>
          ) : (
            <span className="text-slate-500">Unassigned</span>
          )}
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />

            <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-20">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assign to
              </div>

              <button
                onClick={() => handleAssign(null)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left text-sm"
              >
                <X className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Unassigned</span>
              </button>

              {members.map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => handleAssign(member.user_id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left text-sm"
                >
                  <UserCircle className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700">{member.users.email}</span>
                  {assignment?.assigned_to === member.user_id && (
                    <Check className="w-4 h-4 text-indigo-600 ml-auto" />
                  )}
                </button>
              ))}

              {members.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-500">
                  No team members found
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {assignment && (
        <div className="flex items-center gap-2">
          <select
            value={assignment.status}
            onChange={(e) => handleStatusChange(e.target.value as Assignment['status'])}
            disabled={assigning}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
              statusColors[assignment.status]
            } focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
          >
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      )}
    </div>
  );
}
