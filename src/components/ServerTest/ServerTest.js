import React, { useState, useEffect } from 'react';
import { checkServerHealth, getScripts } from '../../services/scriptService';
import './ServerTest.css';

const ServerTest = ({ onBack }) => {
  const [serverStatus, setServerStatus] = useState('Checking...');
  const [scripts, setScripts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkServer = async () => {
      try {
        setLoading(true);
        const health = await checkServerHealth();
        setServerStatus(health.status || 'Unknown');

        const scriptsData = await getScripts();
        setScripts(scriptsData);
        setError(null);
      } catch (err) {
        setServerStatus('Offline');
        setError('Failed to connect to server. Make sure the backend is running.');
        console.error('Server connection error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkServer();
  }, []);

  return (
    <div className="server-test">
      <h2>Server Connection Test</h2>

      <div className="status-card">
        <h3>Server Status</h3>
        <div className={`status-indicator ${serverStatus === 'Server is running' ? 'online' : 'offline'}`}>
          {serverStatus}
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      {!error && (
        <div className="scripts-section">
          <h3>Available Scripts</h3>
          {loading ? (
            <p>Loading scripts...</p>
          ) : (
            <ul className="scripts-list">
              {scripts.length > 0 ? (
                scripts.map(script => (
                  <li key={script.id} className="script-item">
                    <h4>{script.title}</h4>
                    <p>{script.description}</p>
                  </li>
                ))
              ) : (
                <p>No scripts available</p>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="info-box">
        <h4>How to start the server</h4>
        <p>Run <code>npm run server</code> to start the backend server only.</p>
        <p>Run <code>npm run dev</code> to start both frontend and backend together.</p>
      </div>

      <div className="center">
        <button onClick={onBack} className="back-button">Back to Home</button>
      </div>
    </div>
  );
};

export default ServerTest;
