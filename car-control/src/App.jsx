import { useState, useEffect, useRef, useCallback } from "react";
import { ref, set, onValue } from "firebase/database";
import { db, authReady } from "./firebase";

/* ---------- CONFIG ---------- */
const BRAKE_CM = 20;
const WARN_CM = 60;
const MAX_CM = 150;
const STALE_MS = 3000; // no sensor update in this long => treat as offline

const css = `
@import url('https://fonts.googleapis.com/css2?family=Stardos+Stencil:wght@700&family=Barlow+Condensed:wght@500;600&display=swap');
.cc{--bg:#241812;--panel:#382619;--line:#6b4a32;--mid:#8a6242;--tan:#c9a27a;--cream:#ecd9c0;--amber:#d9822b;--red:#b5432f;--ok:#b08a5b;--offline:#5a5145;
  min-height:100%;background:var(--bg);color:var(--cream);font-family:'Barlow Condensed',sans-serif;font-size:clamp(16px,2.6vw,20px);
  padding:clamp(10px,3vw,24px);display:flex;flex-direction:column;align-items:center;gap:clamp(12px,2.5vw,20px);box-sizing:border-box}
.cc *{box-sizing:border-box}
.cc h1,.cc h2{font-family:'Stardos Stencil',serif;margin:0;letter-spacing:.06em;font-weight:700}
.cc h1{font-size:clamp(22px,5vw,32px);color:var(--tan)}
.cc h2{font-size:clamp(16px,3vw,20px);color:var(--tan);border-bottom:2px solid var(--line);padding-bottom:6px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:8px}
.cc header{width:100%;max-width:560px;border:2px solid var(--tan);background:var(--line);padding:10px 16px;text-align:center;display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap}
.cc header h1{color:var(--cream)}
.cc .link-badge{font-size:.55em;letter-spacing:.08em;padding:3px 10px;border:2px solid var(--ok);color:var(--ok);font-family:'Barlow Condensed',sans-serif;font-weight:600}
.cc .link-badge.off{border-color:var(--offline);color:var(--offline)}
.cc .panel{width:100%;max-width:560px;background:var(--panel);border:2px solid var(--line);padding:clamp(12px,3vw,20px);position:relative}
.cc .panel::before,.cc .panel::after{content:"";position:absolute;width:10px;height:10px;background:var(--tan)}
.cc .panel::before{top:-2px;left:-2px}.cc .panel::after{bottom:-2px;right:-2px}
.cc .radar{width:100%;max-width:440px;margin:0 auto;display:block;transition:opacity .3s}
.cc .radar.offline{opacity:.35}
.cc .readouts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;text-align:center}
.cc .readouts div{border:2px solid var(--line);padding:6px}
.cc .readouts b{display:block;font-family:'Stardos Stencil',serif;font-size:clamp(20px,4vw,26px)}
.cc .alert{margin-top:12px;padding:8px 12px;border:2px solid var(--ok);color:var(--ok);font-weight:600;letter-spacing:.06em;text-align:center}
.cc .alert.warn{border-color:var(--amber);color:var(--amber)}
.cc .alert.halt{border-color:var(--red);background:var(--red);color:var(--cream)}
.cc .alert.offline{border-color:var(--offline);color:var(--offline)}
.cc .dpad{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(6px,2vw,10px);width:min(100%,340px);margin:4px auto 16px}
.cc .dpad span{display:block}
.cc button{font:inherit;font-weight:600;letter-spacing:.06em;cursor:pointer;background:var(--line);color:var(--cream);border:2px solid var(--tan);
  touch-action:none;user-select:none;-webkit-user-select:none}
.cc button:hover{background:var(--mid)}
.cc button:focus-visible,.cc input:focus-visible{outline:3px solid var(--amber);outline-offset:2px}
.cc button.active{background:var(--tan);color:var(--bg)}
.cc .dpad button{aspect-ratio:1;width:100%;font-size:clamp(22px,6vw,32px);padding:0}
.cc .dpad .stop{background:var(--red);border-color:var(--cream);font-size:clamp(14px,3.5vw,18px)}
.cc .dpad .stop:hover,.cc .dpad .stop.active{background:#cf5540;color:var(--cream)}
.cc input[type=range]{width:100%;accent-color:var(--tan)}
.cc .hint{color:var(--tan);font-size:.85em;margin:8px 0 0}
@media (min-width:900px){
  .cc .layout{display:flex;gap:20px;width:100%;max-width:1000px;align-items:stretch}
  .cc .layout .panel{max-width:none;flex:1}
}
@media (max-width:899px){.cc .layout{display:contents}}
`;

const zoneColor = (d) => (d < BRAKE_CM ? "#b5432f" : d < WARN_CM ? "#d9822b" : "#b08a5b");

/* ---------- RADAR ---------- */
const CX = 150, CY = 190;
const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};
const wedge = (r, a1, a2) => {
  const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2);
  return `M${CX} ${CY} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`;
};

function Radar({ front, left, right, live }) {
  const scale = (d) => 30 + (Math.min(d, MAX_CM) / MAX_CM) * 140;
  const zones = [
    { d: left,  a1: -90, a2: -30 },
    { d: front, a1: -30, a2:  30 },
    { d: right, a1:  30, a2:  90 },
  ];
  return (
    <svg className={`radar ${live ? "" : "offline"}`} viewBox="0 0 300 200" role="img" aria-label="Obstacle radar">
      {[60, 100, 140, 170].map((r) => (
        <path key={r} d={`M${pt(r, -90)} A${r} ${r} 0 0 1 ${pt(r, 90)}`} fill="none" stroke="#6b4a32" strokeWidth="2" />
      ))}
      {[-30, 30].map((a) => (
        <line key={a} x1={CX} y1={CY} x2={pt(175, a)[0]} y2={pt(175, a)[1]} stroke="#6b4a32" strokeWidth="2" />
      ))}
      {zones.map((z, i) => (
        <path key={i} d={wedge(scale(z.d), z.a1, z.a2)} fill={live ? zoneColor(z.d) : "#5a5145"} fillOpacity="0.85" stroke="#ecd9c0" strokeWidth="1.5" />
      ))}
      <rect x={CX - 12} y={CY - 26} width="24" height="36" fill="#241812" stroke="#c9a27a" strokeWidth="2" />
      <rect x={CX - 5} y={CY - 26} width="10" height="8" fill="#c9a27a" />
    </svg>
  );
}

/* ---------- MAIN ---------- */
export default function CarControl() {
  const [speed, setSpeed] = useState(60);
  const [dir, setDir] = useState("S");
  const [dist, setDist] = useState({ front: MAX_CM, left: MAX_CM, right: MAX_CM });
  const [lastSeen, setLastSeen] = useState(0);
  const [now, setNow] = useState(Date.now());

  const speedRef = useRef(speed);
  const distRef = useRef(dist);
  const dirRef = useRef("S");
  const liveRef = useRef(false);
  speedRef.current = speed;
  distRef.current = dist;

  // Ensure anonymous auth is complete before any DB writes
  useEffect(() => { authReady.catch(() => {}); }, []);

  // Clock tick, used only to re-evaluate whether the sensor feed has gone stale
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const live = lastSeen > 0 && now - lastSeen < STALE_MS;
  liveRef.current = live;

  // Push a command to Firebase
  const send = useCallback((cmd) => {
    if (cmd === "F" && liveRef.current && distRef.current.front < BRAKE_CM) cmd = "S";
    dirRef.current = cmd;
    setDir(cmd);

    set(ref(db, "command"), {
      cmd,
      speed: cmd === "S" ? 0 : speedRef.current,
      ts: Date.now(),
    }).catch((e) => console.error("DB write failed:", e));
  }, []);

  // Also push speed changes live
  useEffect(() => {
    set(ref(db, "command/speed"), dirRef.current === "S" ? 0 : speed).catch(() => {});
  }, [speed]);

  // Subscribe to live ultrasonic readings from the ESP32 at /sensor
  // Expected shape written by the firmware: { front: cm, left: cm, right: cm, ts: millis }
  useEffect(() => {
    const unsub = onValue(ref(db, "sensor"), (snap) => {
      const d = snap.val();
      if (!d) return;
      setDist({
        front: Number(d.front ?? MAX_CM),
        left: Number(d.left ?? MAX_CM),
        right: Number(d.right ?? MAX_CM),
      });
      setLastSeen(Date.now());
    });
    return () => unsub();
  }, []);

  // Auto-brake, only acts on real readings
  useEffect(() => {
    if (live && dist.front < BRAKE_CM && dirRef.current === "F") send("S");
  }, [dist.front, live, send]);

  // Keyboard
  useEffect(() => {
    const map = { ArrowUp: "F", w: "F", ArrowDown: "B", s: "B", ArrowLeft: "L", a: "L", ArrowRight: "R", d: "R", " ": "S" };
    const down = (e) => {
      if (e.target.tagName === "INPUT" || e.repeat) return;
      const c = map[e.key];
      if (c) { e.preventDefault(); send(c); }
    };
    const up = (e) => { if (map[e.key] && map[e.key] !== "S") send("S"); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [send]);

  const nearest = Math.min(dist.front, dist.left, dist.right);
  const status = !live
    ? ["offline", "NO SENSOR LINK"]
    : dist.front < BRAKE_CM
    ? ["halt", "OBSTACLE AHEAD: FORWARD LOCKED"]
    : nearest < WARN_CM
    ? ["warn", "CAUTION: OBJECT CLOSE"]
    : ["", "PATH CLEAR"];

  const Btn = ({ c, label, cls = "" }) => (
    <button
      className={`${cls} ${dir === c ? "active" : ""}`}
      aria-label={label}
      onPointerDown={() => send(c)}
      onPointerUp={() => c !== "S" && send("S")}
      onPointerLeave={() => dir === c && c !== "S" && send("S")}
    >
      {c === "F" ? "▲" : c === "B" ? "▼" : c === "L" ? "◀" : c === "R" ? "▶" : "STOP"}
    </button>
  );

  return (
    <div className="cc">
      <style>{css}</style>
      <header>
        <h1>RECON UNIT 01</h1>
        <span className={`link-badge ${live ? "" : "off"}`}>{live ? "SENSOR LINK" : "NO LINK"}</span>
      </header>
      <div className="layout">
        <section className="panel">
          <h2>Obstacle radar</h2>
          <Radar {...dist} live={live} />
          <div className="readouts">
            {[["Left", dist.left], ["Front", dist.front], ["Right", dist.right]].map(([n, v]) => (
              <div key={n}><b style={{ color: live ? zoneColor(v) : "#5a5145" }}>{live ? Math.round(v) : "--"}</b>{n} cm</div>
            ))}
          </div>
          <div className={`alert ${status[0]}`}>{status[1]}</div>
        </section>

        <section className="panel">
          <h2>Drive controls</h2>
          <div className="dpad">
            <span /><Btn c="F" label="Forward" /><span />
            <Btn c="L" label="Left" /><Btn c="S" label="Stop" cls="stop" /><Btn c="R" label="Right" />
            <span /><Btn c="B" label="Reverse" /><span />
          </div>
          <label htmlFor="spd">Speed: {speed}%</label>
          <input id="spd" type="range" min="10" max="100" step="5" value={speed} onChange={(e) => setSpeed(+e.target.value)} />
          <p className="hint">Hold to drive, release to stop. Keyboard: WASD or arrows, Space to stop.</p>
        </section>
      </div>
    </div>
  );
}
