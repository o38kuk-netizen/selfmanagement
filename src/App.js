import { useState, useEffect, useRef } from "react";
import { Sun, Flame, PenLine, Wind, Moon, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";

const T = {
  ink: "#191410",
  inkSoft: "#221B15",
  line: "rgba(239,230,216,0.08)",
  lineActive: "rgba(239,230,216,0.2)",
  emberDim: "#B8451F",
  ember: "#E8622E",
  emberBright: "#F2955F",
  clay: "#B98A46",
  clayDim: "#7C6239",
  clayBright: "#D9B876",
  paper: "#EFE6D8",
  ash: "#8B8071",
};

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL = { mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土", sun: "日" };

const FIRE_ROWS = [
  { key: "light", label: "朝日", icon: Sun },
  { key: "warm", label: "温める", icon: Flame },
  { key: "write", label: "書く", icon: PenLine },
  { key: "still", label: "静める", icon: Wind },
];
const EARTH_ROW = { key: "rhythm", label: "リズム", icon: Moon };

const MANTRAS = [
  "戻れば、それでいい。やめなければ続いている。",
  "これは①(専門)に効くか？で選ぶ。",
  "財より地力。好条件ほど一拍置く。",
  "70点で出して回す。",
];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function keyFromDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function dateFromKeyPart(part) {
  const y = Number(part.slice(0, 4));
  const m = Number(part.slice(4, 6)) - 1;
  const d = Number(part.slice(6, 8));
  return new Date(y, m, d);
}

function formatRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(monday)} — ${fmt(sunday)}`;
}

function todayDayKey() {
  const jsDay = new Date().getDay();
  const idx = (jsDay + 6) % 7;
  return DAY_ORDER[idx];
}

function emptyWeek() {
  return {
    anchors: Object.fromEntries(
      DAY_ORDER.map((d) => [d, { light: false, warm: false, write: false, still: false, rhythm: false }])
    ),
    targets: {
      learning: { value: 0, target: 3, step: 0.5, unit: "h" },
      training: { value: 0, target: 3, step: 1, unit: "回" },
      sauna: { value: 0, target: 2, step: 1, unit: "回" },
    },
    dayOff: null,
    note: "",
  };
}

function computeScore(w) {
  if (!w) return { fire: 0, earth: 0 };
  let fireDaily = 0;
  let earthDaily = 0;
  DAY_ORDER.forEach((d) => {
    const a = w.anchors[d];
    fireDaily += (a.light ? 1 : 0) + (a.warm ? 1 : 0) + (a.write ? 1 : 0) + (a.still ? 1 : 0);
    earthDaily += a.rhythm ? 1 : 0;
  });
  const fireDailyPct = fireDaily / (4 * 7);
  const earthDailyPct = earthDaily / 7;
  const learningPct = Math.min(w.targets.learning.value / w.targets.learning.target, 1);
  const saunaPct = Math.min(w.targets.sauna.value / w.targets.sauna.target, 1);
  const dayOffPct = w.dayOff ? 1 : 0;
  const fireWeeklyPct = (learningPct + saunaPct + dayOffPct) / 3;
  const trainingPct = Math.min(w.targets.training.value / w.targets.training.target, 1);
  const earthWeeklyPct = trainingPct;
  const fire = Math.round((fireDailyPct * 0.5 + fireWeeklyPct * 0.5) * 100);
  const earth = Math.round((earthDailyPct * 0.5 + earthWeeklyPct * 0.5) * 100);
  return { fire, earth };
}

function summaryText(fire, earth) {
  const avg = (fire + earth) / 2;
  if (avg >= 70) return "火も土もよく満ちています。今の調子で、無理はしないで。";
  if (avg >= 40) return "ぼちぼち整っています。今の一歩で十分です。";
  if (avg >= 15) return "薄めの週です。それでも続いていれば、それでいい。";
  return "今週はまだ何も始まっていなくても大丈夫。ひとつだけ、今できることを。";
}

export default function HabitTracker() {
  const [monday] = useState(() => getMonday(new Date()));
  const weekKey = `week:${keyFromDate(monday)}`;
  const [week, setWeek] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [today] = useState(() => todayDayKey());
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const skipFirstSave = useRef(true);

  // Load data on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = localStorage.getItem(weekKey);
        if (stored) {
          setWeek(JSON.parse(stored));
        } else {
          setWeek(emptyWeek());
        }
      } catch (e) {
        console.error("Failed to load data:", e);
        setWeek(emptyWeek());
      } finally {
        setLoaded(true);
      }
    })();
  }, [weekKey]);

  // Save data whenever week changes
  useEffect(() => {
    if (!loaded || !week) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem(weekKey, JSON.stringify(week));
      setError(false);
    } catch (e) {
      console.error("Failed to save data:", e);
      setError(true);
    } finally {
      setSaving(false);
    }
  }, [week, weekKey, loaded]);

  if (!loaded || !week) {
    return (
      <div
        style={{
          background: T.ink,
          color: T.ash,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Zen Kaku Gothic New', sans-serif",
          fontSize: 14,
        }}
      >
        整えています
      </div>
    );
  }

  const { fire, earth } = computeScore(week);

  const toggleAnchor = (day, key) => {
    setWeek((prev) => ({
      ...prev,
      anchors: { ...prev.anchors, [day]: { ...prev.anchors[day], [key]: !prev.anchors[day][key] } },
    }));
  };

  const adjustTarget = (key, delta) => {
    setWeek((prev) => ({
      ...prev,
      targets: {
        ...prev.targets,
        [key]: {
          ...prev.targets[key],
          value: Math.max(0, Math.round((prev.targets[key].value + delta) * 10) / 10),
        },
      },
    }));
  };

  const toggleDayOff = (day) => {
    setWeek((prev) => ({ ...prev, dayOff: prev.dayOff === day ? null : day }));
  };

  const onNoteChange = (e) => {
    setWeek((prev) => ({ ...prev, note: e.target.value }));
  };

  const loadHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (history) return;

    setHistoryLoading(true);
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("week:") && key !== weekKey) {
          keys.push(key);
        }
      }
      
      const items = keys
        .sort()
        .reverse()
        .slice(0, 6)
        .map((k) => {
          try {
            const d = JSON.parse(localStorage.getItem(k));
            const sc = computeScore(d);
            const mon = dateFromKeyPart(k.replace("week:", ""));
            return { key: k, range: formatRange(mon), ...sc };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      setHistory(items);
    } catch (e) {
      console.error("Failed to load history:", e);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div style={{ background: T.ink, minHeight: "100vh", color: T.paper, paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        .f-display { font-family: 'Shippori Mincho', serif; }
        .f-body { font-family: 'Zen Kaku Gothic New', sans-serif; }
        .f-mono { font-family: 'JetBrains Mono', monospace; }
        .cell-btn { transition: background-color 0.1s ease, border-color 0.1s ease; }
        textarea::placeholder { color: ${T.ash}; opacity: 0.5; }
        input[type="text"]:focus, textarea:focus { outline: 1px solid ${T.ash}; }
        button:focus-visible { outline: 1px solid ${T.ash}; }
      `}</style>

      <div style={{ maxWidth: 440, margin: "0 auto", padding: "40px 20px 0" }}>
        {/* Header */}
        <div className="f-mono" style={{ color: T.ash, fontSize: 11, letterSpacing: 1 }}>
          {formatRange(monday)}
        </div>
        <div
          className="f-display"
          style={{ fontSize: 28, fontWeight: 700, marginTop: 4, marginBottom: 24, letterSpacing: 0.5 }}
        >
          今週の火と土
        </div>

        {/* Gauges */}
        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
          <Gauge label="火" value={fire} color={T.ember} />
          <Gauge label="土" value={earth} color={T.clay} />
        </div>
        <div
          className="f-body"
          style={{ fontSize: 12.5, color: T.ash, lineHeight: 1.7, marginBottom: 36, letterSpacing: 0.2 }}
        >
          {summaryText(fire, earth)}
        </div>

        {/* Daily anchors grid */}
        <SectionLabel>日々のアンカー</SectionLabel>
        <div
          style={{
            border: `1px solid ${T.line}`,
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 32,
            background: T.inkSoft,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "68px repeat(7, 1fr)" }}>
            <div />
            {DAY_ORDER.map((d) => (
              <div
                key={d}
                className="f-body"
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  padding: "12px 0 8px",
                  color: d === today ? T.paper : T.ash,
                  fontWeight: d === today ? 600 : 400,
                  borderBottom: `1px solid ${T.line}`,
                  background: d === today ? "rgba(239,230,216,0.02)" : "transparent",
                }}
              >
                {DAY_LABEL[d]}
              </div>
            ))}
            {FIRE_ROWS.map((row) => (
              <RowCells
                key={row.key}
                row={row}
                week={week}
                today={today}
                onToggle={toggleAnchor}
                activeColor={T.ember}
              />
            ))}
            <RowCells
              row={EARTH_ROW}
              week={week}
              today={today}
              onToggle={toggleAnchor}
              activeColor={T.clay}
              last
            />
          </div>
        </div>

        {/* Weekly targets */}
        <SectionLabel>週の目標</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          <TargetRow
            label="学び（①専門）"
            data={week.targets.learning}
            onAdjust={(d) => adjustTarget("learning", d)}
            accent={T.ember}
          />
          <TargetRow
            label="筋トレ"
            data={week.targets.training}
            onAdjust={(d) => adjustTarget("training", d)}
            accent={T.clay}
          />
          <TargetRow
            label="サウナ・湯船"
            data={week.targets.sauna}
            onAdjust={(d) => adjustTarget("sauna", d)}
            accent={T.ember}
          />
        </div>

        {/* Day Off */}
        <SectionLabel>完全オフの日</SectionLabel>
        <div style={{ display: "flex", gap: 4, marginBottom: 36 }}>
          {DAY_ORDER.map((d) => (
            <button
              key={d}
              className="cell-btn f-body"
              onClick={() => toggleDayOff(d)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 4,
                border: `1px solid ${week.dayOff === d ? T.ash : T.line}`,
                background: week.dayOff === d ? "rgba(239,230,216,0.08)" : "transparent",
                color: week.dayOff === d ? T.paper : T.ash,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {DAY_LABEL[d]}
            </button>
          ))}
        </div>

        {/* Note */}
        <SectionLabel>今週のメモ</SectionLabel>
        <textarea
          className="f-body"
          value={week.note}
          onChange={onNoteChange}
          placeholder="詰まった時に開けばいい場所。"
          rows={3}
          style={{
            width: "100%",
            background: T.inkSoft,
            border: `1px solid ${T.line}`,
            borderRadius: 6,
            padding: 12,
            color: T.paper,
            fontSize: 13,
            lineHeight: 1.6,
            resize: "none",
            marginBottom: 36,
            boxSizing: "border-box",
          }}
        />

        {/* Compass / Mantras */}
        <div
          style={{
            paddingLeft: 16,
            marginBottom: 40,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderLeft: `1px solid ${T.lineActive}`,
          }}
        >
          {MANTRAS.map((m) => (
            <div
              key={m}
              className="f-body"
              style={{ fontSize: 12, color: T.ash, lineHeight: 1.6, letterSpacing: 0.2 }}
            >
              {m}
            </div>
          ))}
        </div>

        {/* History */}
        <button
          onClick={loadHistory}
          className="f-body"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "12px 0",
            background: "transparent",
            border: `1px solid ${T.line}`,
            borderRadius: 6,
            color: T.ash,
            fontSize: 12,
            cursor: "pointer",
            marginBottom: showHistory ? 12 : 0,
          }}
        >
          <span>過去の記録</span> {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showHistory && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {historyLoading && (
              <div
                className="f-body"
                style={{ fontSize: 11, color: T.ash, textAlign: "center", padding: "12px 0" }}
              >
                読み込み中
              </div>
            )}
            {!historyLoading && history && history.length === 0 && (
              <div
                className="f-body"
                style={{ fontSize: 11, color: T.ash, textAlign: "center", padding: "12px 0" }}
              >
                記録がありません。
              </div>
            )}
            {!historyLoading &&
              history &&
              history.map((h) => (
                <div
                  key={h.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    border: `1px solid ${T.line}`,
                    borderRadius: 6,
                    background: T.inkSoft,
                  }}
                >
                  <span className="f-mono" style={{ fontSize: 11, color: T.ash }}>
                    {h.range}
                  </span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <MiniBar value={h.fire} color={T.ember} label="火" />
                    <MiniBar value={h.earth} color={T.clay} label="土" />
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Status messages */}
        {saving && (
          <div
            className="f-body"
            style={{ fontSize: 11, color: T.ash, textAlign: "center", marginTop: 12, opacity: 0.6 }}
          >
            保存中...
          </div>
        )}
        {error && (
          <div
            className="f-body"
            style={{ fontSize: 11, color: T.ash, textAlign: "center", marginTop: 12, opacity: 0.6 }}
          >
            保存に失敗しました
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      className="f-body"
      style={{ fontSize: 11, color: T.ash, letterSpacing: 0.8, marginBottom: 12, fontWeight: 500 }}
    >
      {children}
    </div>
  );
}

function Gauge({ label, value, color }) {
  const height = 120;
  const fillH = (value / 100) * height;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          width: "100%",
          height,
          borderRadius: 6,
          background: T.inkSoft,
          border: `1px solid ${T.line}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: fillH,
            background: color,
            opacity: 0.85,
            transition: "height 0.3s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginTop: 6,
          padding: "0 2px",
        }}
      >
        <span className="f-display" style={{ fontSize: 16, fontWeight: 700, color: T.paper }}>
          {label}
        </span>
        <span className="f-mono" style={{ fontSize: 11, color: T.ash }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

function RowCells({ row, week, today, onToggle, activeColor, last }) {
  const Icon = row.icon;
  return (
    <>
      <div
        className="f-body"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: T.ash,
          padding: "10px 8px",
          borderBottom: last ? "none" : `1px solid ${T.line}`,
        }}
      >
        <Icon size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
        <span>{row.label}</span>
      </div>
      {DAY_ORDER.map((d) => {
        const on = week.anchors[d][row.key];
        return (
          <div
            key={d}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: last ? "none" : `1px solid ${T.line}`,
              background: d === today ? "rgba(239,230,216,0.01)" : "transparent",
            }}
          >
            <button
              aria-label={`${DAY_LABEL[d]}曜日 ${row.label} ${on ? "済み" : "未"}`}
              className="cell-btn"
              onClick={() => onToggle(d, row.key)}
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                border: `1px solid ${on ? activeColor : "transparent"}`,
                background: on ? activeColor : "rgba(239,230,216,0.03)",
                cursor: "pointer",
              }}
            />
          </div>
        );
      })}
    </>
  );
}

function TargetRow({ label, data, onAdjust, accent }) {
  const pct = Math.min(100, Math.round((data.value / data.target) * 100));
  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 6, padding: 12, background: T.inkSoft }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span className="f-body" style={{ fontSize: 12.5, color: T.paper }}>
          {label}
        </span>
        <span className="f-mono" style={{ fontSize: 11, color: T.ash }}>
          {data.value} / {data.target} {data.unit}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            flex: 1,
            height: 3,
            background: "rgba(239,230,216,0.05)",
            overflow: "hidden",
            borderRadius: 2,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: accent,
              transition: "width 0.2s ease",
              opacity: 0.9,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            aria-label={`${label}を減らす`}
            className="cell-btn"
            onClick={() => onAdjust(-data.step)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: `1px solid ${T.line}`,
              background: "transparent",
              color: T.ash,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Minus size={11} />
          </button>
          <button
            aria-label={`${label}を増やす`}
            className="cell-btn"
            onClick={() => onAdjust(data.step)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              border: `1px solid ${T.line}`,
              background: "transparent",
              color: T.paper,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Plus size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ value, color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span className="f-body" style={{ fontSize: 10, color: T.ash }}>
        {label}
      </span>
      <div
        style={{
          width: 24,
          height: 3,
          background: "rgba(239,230,216,0.05)",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${value}%`, height: "100%", background: color, opacity: 0.8 }} />
      </div>
    </div>
  );
}
