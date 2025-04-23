import React from 'react';
import { useAuth } from '../context/AuthContext';

const UserProfile = ({ onBack }) => {
  const { user, logout } = useAuth();

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      <div className="profile-info">
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Display Name:</strong> {user.displayName}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Groups:</strong> {user.groups?.join(', ') || 'None'}</p>
      </div>
      <div className="profile-actions">
        <button onClick={logout} className="logout-button">Logout</button>
        <button onClick={onBack} className="back-button">Back</button>
      </div>
    </div>
  );
};

export default UserProfile;
