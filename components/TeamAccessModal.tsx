"use client";

import { useState, useEffect } from "react";
import { Brand, TeamMember, TeamInvitation } from "@/lib/types";

interface Props {
  brand: Brand;
  onClose: () => void;
}

interface MembersData {
  members: TeamMember[];
  invitations: TeamInvitation[];
}

export default function TeamAccessModal({ brand, onClose }: Props) {
  const [data, setData] = useState<MembersData>({ members: [], invitations: [] });
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/team/members?brand_id=${brand.id}`);
      const json = await res.json() as MembersData & { error?: string };
      if (!json.error) {
        setData({ members: json.members ?? [], invitations: json.invitations ?? [] });
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');
    setInviteLink('');
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brand.id,
          brand_name: brand.name,
          brand_emoji: brand.emoji,
          invited_email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });
      const json = await res.json() as { token?: string; error?: string };
      if (json.error) {
        if (json.error === 'already_member') {
          setError('המשתמש כבר חבר צוות במותג זה');
        } else {
          setError(json.error);
        }
      } else if (json.token) {
        const link = `${window.location.origin}/invite/${json.token}`;
        setInviteLink(link);
        setInviteEmail('');
        loadMembers();
      }
    } catch {
      setError('שגיאה בשליחת ההזמנה');
    }
    setInviting(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      });
      loadMembers();
    } catch { /* silent */ }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    try {
      await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId }),
      });
      loadMembers();
    } catch { /* silent */ }
  };

  const handleChangeRole = async (memberId: string, role: string) => {
    try {
      await fetch('/api/team/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, role }),
      });
      loadMembers();
    } catch { /* silent */ }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-gray-900 text-base">
              {brand.emoji} גישת צוות — {brand.name}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">הזמן חברי צוות לגשת למותג זה</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 font-bold text-base transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Invite section */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#f8fafc', border: '1.5px solid #e8edf3' }}>
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <span>✉️</span> הזמן איש צוות
            </h3>

            {/* Email field — full width, clearly labeled */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">כתובת אימייל</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="name@example.com"
                className="input text-sm w-full"
                dir="ltr"
                style={{ textAlign: 'left' }}
                autoComplete="off"
              />
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">הרשאה</label>
              <div className="flex gap-2">
                {(['editor', 'viewer'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInviteRole(r)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: inviteRole === r ? 'var(--brand-gradient)' : 'white',
                      color: inviteRole === r ? 'white' : '#6b7280',
                      border: inviteRole === r ? 'none' : '1.5px solid #e6ebf1',
                      boxShadow: inviteRole === r ? '0 2px 8px rgba(14,95,168,0.2)' : 'none',
                    }}
                  >
                    {r === 'editor' ? '✏️ עורך — יכול לערוך' : '👁️ צופה — קריאה בלבד'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs flex items-center gap-1">⚠️ {error}</p>
            )}

            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="btn btn-orange text-sm w-full justify-center"
              style={{ padding: '12px 18px' }}
            >
              {inviting ? '⏳ שולח...' : '📨 שלח קישור הזמנה'}
            </button>
          </div>

            {/* Invite link */}
            {inviteLink && (
              <div
                className="mt-3 p-3 rounded-xl"
                style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}
              >
                <p className="text-xs font-bold text-green-700 mb-2">קישור ההזמנה מוכן!</p>
                <div className="flex gap-2 items-center">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 truncate"
                    dir="ltr"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopy}
                    className="btn btn-ghost text-xs px-3 py-1.5 shrink-0"
                    style={{ minHeight: 'unset' }}
                  >
                    {copied ? '✓ הועתק!' : 'העתק'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Members section */}
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-teal-200 border-t-teal-500 animate-spin" />
            </div>
          ) : (
            <>
              {data.members.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-700 text-sm mb-3">
                    חברי צוות פעילים ({data.members.length})
                  </h3>
                  <div className="space-y-2">
                    {data.members.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb' }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                          style={{ background: 'var(--brand-gradient)', color: 'white' }}
                        >
                          {member.member_email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 truncate" dir="ltr">
                            {member.member_email}
                          </p>
                        </div>
                        <select
                          value={member.role}
                          onChange={e => handleChangeRole(member.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600"
                          style={{ minHeight: 'unset' }}
                        >
                          <option value="editor">עורך</option>
                          <option value="viewer">צופה</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="btn btn-red text-xs px-2 py-1 shrink-0"
                          style={{ minHeight: 'unset' }}
                        >
                          הסר
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending invites section */}
              {data.invitations.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-700 text-sm mb-3">
                    הזמנות ממתינות ({data.invitations.length})
                  </h3>
                  <div className="space-y-2">
                    {data.invitations.map(inv => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}
                      >
                        <div
                          className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm shrink-0"
                        >
                          ⏳
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 truncate" dir="ltr">
                            {inv.invited_email}
                          </p>
                          <p className="text-[11px] text-amber-600">
                            {inv.role === 'editor' ? 'עורך' : 'צופה'} · ממתין לאישור
                          </p>
                        </div>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="btn btn-ghost text-xs px-2 py-1 shrink-0"
                          style={{ minHeight: 'unset', color: '#9ca3af' }}
                        >
                          ביטול
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.members.length === 0 && data.invitations.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">אין חברי צוות עדיין</p>
                  <p className="text-gray-300 text-xs mt-1">הזמן אנשים על ידי שליחת קישור</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
