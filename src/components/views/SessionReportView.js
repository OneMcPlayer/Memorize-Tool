import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../data/translations';
import './SessionReportView.css';

const SessionReportView = ({ sessionData, onRestart, onClose }) => {
  const { currentLang } = useAppContext();
  const t = translations[currentLang];

  // Format time in minutes and seconds
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Calculate percentage
  const getPercentage = (value, total) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  return (
    <div className="session-report">
      <h2>{t.sessionReport || 'Session Report'}</h2>
      
      <div className="report-summary">
        <div className="summary-item">
          <div className="summary-value">{sessionData.totalLines}</div>
          <div className="summary-label">{t.totalLines || 'Total Lines'}</div>
        </div>
        <div className="summary-item">
          <div className="summary-value">{sessionData.totalAttempts}</div>
          <div className="summary-label">{t.totalAttempts || 'Total Attempts'}</div>
        </div>
        <div className="summary-item">
          <div className="summary-value">{formatTime(sessionData.duration)}</div>
          <div className="summary-label">{t.duration || 'Duration'}</div>
        </div>
        <div className="summary-item">
          <div className="summary-value">{sessionData.attemptsPerLine}</div>
          <div className="summary-label">{t.attemptsPerLine || 'Attempts Per Line'}</div>
        </div>
      </div>
      
      <div className="performance-chart">
        <h3>{t.performance || 'Performance'}</h3>
        <div className="chart-container">
          <div className="chart-bar">
            <div 
              className="chart-segment excellent" 
              style={{ 
                width: `${getPercentage(sessionData.performance.excellent, sessionData.totalAttempts)}%` 
              }}
              title={`${t.excellent || 'Excellent'}: ${sessionData.performance.excellent}`}
            ></div>
            <div 
              className="chart-segment good" 
              style={{ 
                width: `${getPercentage(sessionData.performance.good, sessionData.totalAttempts)}%` 
              }}
              title={`${t.good || 'Good'}: ${sessionData.performance.good}`}
            ></div>
            <div 
              className="chart-segment fair" 
              style={{ 
                width: `${getPercentage(sessionData.performance.fair, sessionData.totalAttempts)}%` 
              }}
              title={`${t.fair || 'Fair'}: ${sessionData.performance.fair}`}
            ></div>
            <div 
              className="chart-segment poor" 
              style={{ 
                width: `${getPercentage(sessionData.performance.poor, sessionData.totalAttempts)}%` 
              }}
              title={`${t.poor || 'Poor'}: ${sessionData.performance.poor}`}
            ></div>
          </div>
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color excellent"></div>
            <div className="legend-label">{t.excellent || 'Excellent'} ({sessionData.performance.excellent})</div>
          </div>
          <div className="legend-item">
            <div className="legend-color good"></div>
            <div className="legend-label">{t.good || 'Good'} ({sessionData.performance.good})</div>
          </div>
          <div className="legend-item">
            <div className="legend-color fair"></div>
            <div className="legend-label">{t.fair || 'Fair'} ({sessionData.performance.fair})</div>
          </div>
          <div className="legend-item">
            <div className="legend-color poor"></div>
            <div className="legend-label">{t.poor || 'Poor'} ({sessionData.performance.poor})</div>
          </div>
        </div>
      </div>
      
      <div className="average-score">
        <h3>{t.averageScore || 'Average Score'}</h3>
        <div className="score-display">
          <div className="score-value">
            {Math.round(sessionData.averageScore * 100)}%
          </div>
          <div className="score-bar">
            <div 
              className="score-fill" 
              style={{ width: `${Math.round(sessionData.averageScore * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="report-actions">
        <button onClick={onRestart} className="primary-btn">
          {t.newSession || 'New Session'}
        </button>
        <button onClick={onClose} className="secondary-btn">
          {t.close || 'Close'}
        </button>
      </div>
    </div>
  );
};

export default SessionReportView;
