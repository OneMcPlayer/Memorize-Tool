import React, { useState, useEffect } from 'react';
import openaiService from '../../services/openaiService';
import './ApiDebugPanel.css';

/**
 * A debug panel that shows OpenAI API usage statistics
 */
const ApiDebugPanel = () => {
  const [apiCallCount, setApiCallCount] = useState(0);
  const [queueLength, setQueueLength] = useState(0);
  const [rpm, setRpm] = useState(openaiService.getRequestsPerMinute());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);

  // Update the API call count and queue length every second
  useEffect(() => {
    const interval = setInterval(() => {
      setApiCallCount(openaiService.getApiCallCount());
      setQueueLength(openaiService.getQueueLength());
      setRpm(openaiService.getRequestsPerMinute());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile && !isExpanded && apiCallCount === 0 && queueLength === 0 && !openaiService.isDebugMode()) {
    return null;
  }

  const title = isMobile && !isExpanded
    ? `API ${apiCallCount}`
    : `OpenAI API Calls: ${apiCallCount}`;

  return (
    <div className={`api-debug-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="api-debug-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="api-debug-icon">🔌</span>
        <span className="api-debug-title">
          {title}
          {queueLength > 0 && <span className="queue-badge">{queueLength}</span>}
        </span>
        <span className="api-debug-toggle">{isExpanded ? '▼' : '▲'}</span>
      </div>

      {isExpanded && (
        <div className="api-debug-content">
          <p>Total API calls in this session: {apiCallCount}</p>
          {queueLength > 0 && (
            <p className="api-debug-queue">
              Requests in queue: <strong>{queueLength}</strong>
            </p>
          )}
          <p className="api-debug-warning">
            Each API call may incur charges to your OpenAI account.
          </p>
          <div className="api-debug-info">
            <p>Debug Mode: {openaiService.isDebugMode() ? 'Enabled' : 'Disabled'}</p>
            <p>Server URL: {openaiService.serverBaseUrl}</p>
            <p>TTS Model: {openaiService.ttsModel}</p>
            <p>API Key Set: {openaiService.apiKey ? 'Yes' : 'No'}</p>
            <p>Rate Limit: {rpm} requests per minute</p>
          </div>
          <div className="api-debug-actions">
            <button
              className="api-debug-reset"
              onClick={() => {
                openaiService.resetApiCallCount();
                setApiCallCount(0);
              }}
            >
              Reset Counter
            </button>
            <button
              className="api-debug-toggle-debug"
              onClick={() => {
                const newMode = !openaiService.isDebugMode();
                openaiService.setDebugMode(newMode);
                // Force a re-render
                setApiCallCount(prev => prev);
              }}
            >
              {openaiService.isDebugMode() ? 'Disable Debug' : 'Enable Debug'}
            </button>
          </div>
          <div className="api-debug-rate-limit">
            <label htmlFor="rpm-input">Rate Limit (requests/min):</label>
            <div className="rpm-control">
              <input
                id="rpm-input"
                type="number"
                min="1"
                max="60"
                value={rpm}
                onChange={(e) => {
                  const newRpm = parseInt(e.target.value, 10);
                  if (newRpm > 0) {
                    openaiService.setRequestsPerMinute(newRpm);
                    setRpm(newRpm);
                  }
                }}
              />
              <span className="rpm-info">
                {rpm <= 3 ? 'Free tier' : rpm <= 10 ? 'Paid tier' : 'High usage'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiDebugPanel;
