// App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

// ---------- Sub-components ----------

const SensorBadge = () => (
  <div className="sensor-badge">
    <span className="dot" />
    OBSTACLE
  </div>
);

const RadarDisplay = ({ distance, maxDistance }) => {
  // Closer = bigger fill (danger)
  const fillPercent = ((1 - distance / maxDistance) * 100).toFixed(0);

  let fillStyle = {
    width: `${fillPercent}%`,
  };

  let distanceClass = 'distance-value';
  if (distance <= 30) {
    distanceClass += ' danger';
    fillStyle.background = 'linear-gradient(90deg, #ff3b3b, #ff6b6b, #ff3b3b)';
    fillStyle.boxShadow = '0 0 16px #ff3b3bcc';
  } else if (distance <= 70) {
    distanceClass += ' warn';
    fillStyle.background = 'linear-gradient(90deg, #f9e45b, #ffb347, #ff8c42)';
    fillStyle.boxShadow = '0 0 12px #f9e45baa';
  } else {
    fillStyle.background = 'linear-gradient(90deg, #3affb0, #5effc1, #a0ffcf)';
    fillStyle.boxShadow = '0 0 12px #3affb0aa';
  }

  return (
    <div className="obstacle-base">
      <div className="radar-display">
        <div className="distance-readout">
          <span className="distance-label">FRONT DISTANCE</span>
          <span>
            <span className={distanceClass}>{Math.round(distance)}</span>
            <span className="distance-unit">cm</span>
          </span>
        </div>
        <div className="proximity-bar-bg">
          <div className="proximity-fill" style={fillStyle} />
        </div>
        <div className="bar-markers">
          <span>200cm</span>
          <span>150</span>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
      </div>
    </div>
  );
};

const ControlButton = ({ className = '', onClick, children, label }) => (
  <button
    className={`ctrl-btn ${className}`}
    onClick={onClick}
    aria-label={label}
    onContextMenu={(e) => e.preventDefault()}
  >
    {children}
  </button>
);

const AlertChip = ({ distance }) => {
  let chipClass = 'alert-chip';
  let icon = '🟢';
  let text = `PATH CLEAR · ${Math.round(distance)}cm`;

  if (distance <= 30) {
    chipClass += ' danger';
    icon = '⚠️';
    text = `OBSTACLE NEAR · ${Math.round(distance)}cm`;
  } else if (distance <= 70) {
    chipClass += ' warn';
    icon = '⚠️';
    text = `CAUTION · ${Math.round(distance)}cm`;
  } else {
    chipClass += ' safe';
  }

  return (
    <div className="obstacle-alert">
      <div className={chipClass}>
        <span className="alert-icon">{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
};

// ---------- Main App ----------

function App() {
  const MIN_DISTANCE = 0;
  const MAX_DISTANCE = 200;

  const [distance, setDistance] = useState(78);
  const driftRef = useRef(null);

  // Clamp + update helper
  const updateDistance = useCallback((amount) => {
    setDistance((prev) => {
      const next = prev + amount;
      return Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, next));
    });
  }, []);

  // Simulate sensor drift every ~3.8s
  useEffect(() => {
    driftRef.current = setInterval(() => {
      setDistance((prev) => {
        if (prev > 10 && prev < 190) {
          const drift = Math.floor(Math.random() * 7) - 3; // -3..3
          return Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, prev + drift));
        }
        return prev;
      });
    }, 3800);

    return () => clearInterval(driftRef.current);
  }, []);

  const handleForward = () => updateDistance(-8);
  const handleBackward = () => updateDistance(10);
  const handleLeft = () => updateDistance(4);
  const handleRight = () => updateDistance(4);

  return (
    <div className="car-dashboard">
      <div className="title-section">
        <h1>⚡ CAR CONTROL</h1>
        <SensorBadge />
      </div>

      <RadarDisplay distance={distance} maxDistance={MAX_DISTANCE} />

      <div className="control-grid">
        <div className="steer-row">
          <ControlButton onClick={handleLeft} label="Turn left">
            ↺
          </ControlButton>
          <ControlButton onClick={handleRight} label="Turn right">
            ↻
          </ControlButton>
        </div>

        <ControlButton
          className="forward-btn"
          onClick={handleForward}
          label="Move forward"
        >
          <span className="arrow-icon">▲</span>
        </ControlButton>

        <ControlButton
          className="backward-btn"
          onClick={handleBackward}
          label="Move backward"
        >
          <span className="arrow-icon">▼</span>
        </ControlButton>
      </div>

      <AlertChip distance={distance} />

      <div className="footer-note">
        <span>◈ OBSTACLE DETECTION · BASE ◈</span>
      </div>
    </div>
  );
}

export default App;