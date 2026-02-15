'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Edit2, Trash2 } from 'lucide-react';

type Comment = {
  id: string;
  comment_text: string;
  mentioned_user_ids: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  users: {
    id: string;
    email: string;
  };
};

type Props = {
  issueGroupId: string;
  currentUserId: string;
};

export default function IssueComments({ issueGroupId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/issue-groups/${issueGroupId}/comments?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [issueGroupId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmitComment() {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/issue-groups/${issueGroupId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_text: newComment })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      const data = await response.json();
      setComments([...comments, data.comment]);
      setNewComment('');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateComment(commentId: string) {
    if (!editText.trim()) return;

    try {
      const response = await fetch(
        `/api/issue-groups/${issueGroupId}/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment_text: editText })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update comment');
      }

      const data = await response.json();
      setComments(comments.map(c => c.id === commentId ? data.comment : c));
      setEditingId(null);
      setEditText('');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(
        `/api/issue-groups/${issueGroupId}/comments/${commentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete comment');
      }

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id);
    setEditText(comment.comment_text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-slate-500">
          <MessageCircle className="w-5 h-5" />
          <span>Loading comments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900">
          Comments ({comments.length})
        </h3>
      </div>

      <div className="space-y-4 mb-4">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-slate-200 pl-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="font-medium text-sm text-slate-900">
                    {comment.users.email}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="text-xs text-slate-400 ml-1">(edited)</span>
                  )}
                </div>

                {/* Edit/Delete buttons for own comments */}
                {comment.user_id === currentUserId && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(comment)}
                      className="text-slate-400 hover:text-slate-600 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-slate-400 hover:text-red-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {editingId === comment.id ? (
                <div className="mt-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdateComment(comment.id)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {comment.comment_text}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Comment Input */}
      <div className="border-t border-slate-200 pt-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={3}
          disabled={submitting}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmitComment}
            disabled={submitting || !newComment.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
