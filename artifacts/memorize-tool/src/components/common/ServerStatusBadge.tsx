import React from "react";
import { useApiHealth } from "../../hooks/useApiHealth";
import "./ServerStatusBadge.css";

const ServerStatusBadge = () => {
  const { status, errorMessage, lastChecked } = useApiHealth();

  const labels: Record<typeof status, string> = {
    checking: "Checking…",
    online: "Online",
    offline: "Offline",
  };

  const tooltipParts: string[] = [];
  if (lastChecked) tooltipParts.push(`Last check: ${lastChecked.toLocaleTimeString()}`);
  if (status === "offline" && errorMessage) tooltipParts.push(errorMessage);

  return (
    <div
      className={`server-status-badge server-status-${status}`}
      title={tooltipParts.join("\n") || undefined}
      role="status"
      aria-live="polite"
    >
      <span className="server-status-indicator" />
      <span className="server-status-label">API: {labels[status]}</span>
    </div>
  );
};

export default ServerStatusBadge;
