import React, { useEffect, useState } from 'react';
import { checkServerHealth } from '../../services/scriptService';
import './ServerStatusBadge.css';

const STATUS = {
  CHECKING: 'checking',
  ONLINE: 'online',
  OFFLINE: 'offline'
};

const POLL_INTERVAL_MS = 30000;

const ServerStatusBadge = () => {
  const [status, setStatus] = useState(STATUS.CHECKING);
  const [lastChecked, setLastChecked] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const runHealthCheck = async () => {
      try {
        const result = await checkServerHealth({ signal: controller.signal });
        if (!isMounted) return;

        if (result && (result.status || result.ok)) {
          setStatus(STATUS.ONLINE);
          setErrorMessage('');
        } else {
          setStatus(STATUS.OFFLINE);
          setErrorMessage('Unexpected response from server');
        }
      } catch (error) {
        if (!isMounted) return;
        setStatus(STATUS.OFFLINE);
        setErrorMessage(error.message || 'Unable to reach server');
      } finally {
        if (isMounted) {
          setLastChecked(new Date());
        }
      }
    };

    runHealthCheck();
    const intervalId = setInterval(runHealthCheck, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, []);

  const badgeClass = `server-status-badge server-status-${status}`;
  const statusLabel = {
    [STATUS.CHECKING]: 'Checking…',
    [STATUS.ONLINE]: 'Online',
    [STATUS.OFFLINE]: 'Offline'
  }[status];

  const tooltipParts = [];
  if (lastChecked) {
    tooltipParts.push(`Last check: ${lastChecked.toLocaleTimeString()}`);
  }
  if (status === STATUS.OFFLINE && errorMessage) {
    tooltipParts.push(errorMessage);
  }

  const tooltip = tooltipParts.join('\n');

  return (
    <div className={badgeClass} title={tooltip || undefined} role="status" aria-live="polite">
      <span className="server-status-indicator" />
      <span className="server-status-label">API: {statusLabel}</span>
    </div>
  );
};

export default ServerStatusBadge;
