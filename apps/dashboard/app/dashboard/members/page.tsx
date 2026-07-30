'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api';

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = async () => {
    const orgId = localStorage.getItem('eventify_org_id');
    if (!orgId) return;

    try {
      const data = await apiRequest(`/organizations/${orgId}/members`, 'GET');
      setMembers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviting(true);

    const orgId = localStorage.getItem('eventify_org_id');
    try {
      await apiRequest(`/organizations/${orgId}/invitations`, 'POST', {
        email: inviteEmail,
        role: inviteRole,
      });
      setSuccess(`Successfully invited ${inviteEmail}!`);
      setInviteEmail('');
      setInviteRole('MEMBER');
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setError('');
    setSuccess('');
    const orgId = localStorage.getItem('eventify_org_id');
    try {
      const updated = await apiRequest(`/organizations/${orgId}/members/${memberId}/role`, 'PATCH', {
        role: newRole,
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: updated.role } : m)));
      setSuccess('Member role updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    setError('');
    setSuccess('');

    const orgId = localStorage.getItem('eventify_org_id');
    try {
      await apiRequest(`/organizations/${orgId}/members/${memberId}`, 'DELETE');
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setSuccess('Team member removed successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: '#64748b' }}>Loading team...</div>;
  }

  const getRoleBadgeStyle = (role: string) => {
    if (role === 'OWNER') return { backgroundColor: '#f0fdf4', color: '#0f766e', border: '1px solid #bbf7d0' };
    if (role === 'ADMIN') return { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' };
    return { backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Team & Members</h2>
        <p style={{ color: '#64748b', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
          Manage your organization's administrators, invite collaborators, and assign roles.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Members List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', margin: 0, color: '#0f172a' }}>Active Workspace Members</h3>
            <span style={{ fontSize: '0.85rem', color: '#0f766e', fontWeight: 600 }}>
              {members.length} Members
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 0' }}>Member Name</th>
                  <th style={{ padding: '0.75rem 0' }}>Role</th>
                  <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const firstInitial = member.user.firstName ? member.user.firstName[0].toUpperCase() : 'U';
                  const roleStyle = getRoleBadgeStyle(member.role);
                  return (
                    <tr key={member.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '1rem 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#0f766e',
                            fontSize: '0.85rem',
                          }}>
                            {firstInitial}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: '#0f172a', display: 'block' }}>
                              {member.user.firstName} {member.user.lastName}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0' }}>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          style={{
                            width: 'auto',
                            padding: '0.3rem 1.25rem 0.3rem 0.6rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '12px',
                            ...roleStyle,
                          }}
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="OWNER">OWNER</option>
                        </select>
                      </td>
                      <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="btn btn-danger"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit', marginTop: 0, marginBottom: '0.4rem', color: '#0f172a' }}>
            Invite Collaborator
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.4 }}>
            Send an email invitation to add a team member to this workspace.
          </p>

          <form onSubmit={handleInvite}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="colleague@company.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Role Permission</label>
              <select id="role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="MEMBER">MEMBER (Create & edit events)</option>
                <option value="ADMIN">ADMIN (Manage tickets & members)</option>
                <option value="OWNER">OWNER (Full control & org billing)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem' }} disabled={inviting}>
              {inviting ? 'Sending Invite...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
