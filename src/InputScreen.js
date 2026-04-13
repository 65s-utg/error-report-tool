import React, { useEffect, useMemo, useRef, useState } from "react";

function buildSlackText(report, type) {
  const eventLabel = type === "occurred" ? "発生" : "復旧";

  return [
    `[${eventLabel}]`,
    `${report.category}`,      // ← 大項目
    `${report.subCategory}`,   // ← 中項目
    `担当:${report.worker}`,
    type === "recovered" ? `停止:${formatDuration(report.downtimeSeconds)}` : null,
    report.detail ? `詳細:${report.detail}` : null,
  ]
    .filter(Boolean)
    .join(" | ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sendToSlack(report, type) {
  const text = buildSlackText(report, type);

  const res = await fetch("/api/slack-post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Slack送信に失敗しました");
  }
}
const lineOptions = ["G3", "M5", "M6", "M7", "M8", "M9"];
const teamOptions = ["A班", "B班", "C班", "D班"];

// 読み仮名順に並べ替え済み
const workerMap = {
  A班: ["伊藤", "佐藤", "鈴木", "高橋", "田中", "渡辺"],
  B班: ["加藤", "小林", "中村", "山田", "山本", "吉田"],
  C班: ["井上", "木村", "清水", "林", "松本", "山崎"],
  D班: ["阿部", "石川", "池田", "橋本", "森", "山口"],
};

const categoryOptions = [
  "ラベラー",
  "実ボトル",
  "キャップIJP",
  "ケーサー",
  "シュリンク",
  "コンベア",
  "ケースIJP",
  "その他",
];

const subCategoryMap = {
  ラベラー: [
    "ラベルフィード異常",
    "ラベル搬送ミス",
    "入り口前倒ビン",
    "識別ラベル未検出",
    "ラベル蛇行",
    "台紙切れ",
    "貼付位置ズレ",
    "その他",
  ],
  実ボトル: [
    "ボトル供給不安定",
    "倒れビン",
    "詰まり",
    "間隔不良",
    "取りこぼし",
    "検出ミス",
    "搬入遅れ",
    "その他",
  ],
  キャップIJP: [
    "印字欠け",
    "印字ずれ",
    "文字かすれ",
    "インク残量低下",
    "センサー反応不良",
    "印字未実施",
    "印字濃度不良",
    "その他",
  ],
  コンベア: [
    "搬送詰まり",
    "蛇行",
    "停止",
    "センサー異常",
    "ガイド接触",
    "速度不安定",
    "乗り継ぎ不良",
    "その他",
  ],
  シュリンク: [
    "フィルム切れ",
    "フィルム蛇行",
    "収縮不足",
    "収縮過多",
    "シール不良",
    "供給不良",
    "位置ズレ",
    "その他",
  ],
  ケーサー: [
    "箱供給不良",
    "箱成形不良",
    "投入不良",
    "取り出し不良",
    "吸着ミス",
    "タイミングずれ",
    "詰まり",
    "その他",
  ],
  ケースIJP: [
    "印字欠け",
    "印字ずれ",
    "文字かすれ",
    "印字未実施",
    "ケース検出不良",
    "インク異常",
    "濃度不良",
    "その他",
  ],
  その他: ["その他-01", "その他-02", "その他-03", "その他-04", "その他"],
};

const STORAGE_KEYS = {
  line: "errorReport_lastLine",
  team: "errorReport_lastTeam",
  worker: "errorReport_lastWorker",
  workerRecentByTeam: "errorReport_workerRecentByTeam",
};

function getNowDateTimeString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}

function calcDowntimeSeconds(occurredAt, recoveredAt) {
  if (!occurredAt) return 0;
  const start = new Date(occurredAt.replace(" ", "T"));
  const end = recoveredAt ? new Date(recoveredAt.replace(" ", "T")) : new Date();
  const diffMs = end - start;
  if (Number.isNaN(diffMs) || diffMs < 0) return 0;
  return Math.floor(diffMs / 1000);
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "0分0秒";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}分${sec}秒`;
}

function toTimeOnly(value) {
  if (!value) return "--:--:--";
  const parts = value.split(" ");
  return parts[1] || value;
}

function getRecentWorkersByTeam() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.workerRecentByTeam) || "{}");
  } catch {
    return {};
  }
}

function saveRecentWorkerByTeam(team, worker) {
  if (!team || !worker) return;
  const recentByTeam = getRecentWorkersByTeam();
  const prev = Array.isArray(recentByTeam[team]) ? recentByTeam[team] : [];
  const updated = [worker, ...prev.filter((name) => name !== worker)].slice(0, 5);
  recentByTeam[team] = updated;
  localStorage.setItem(STORAGE_KEYS.workerRecentByTeam, JSON.stringify(recentByTeam));
}

export default function InputScreen({ onAddReport, darkMode, theme }) {
  const [line, setLine] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [team, setTeam] = useState("");
  const [worker, setWorker] = useState("");
  const [detail, setDetail] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [recoveredAt, setRecoveredAt] = useState("");

  const [displayOccurredAt, setDisplayOccurredAt] = useState("");
  const [displayRecoveredAt, setDisplayRecoveredAt] = useState("");
  const [displayDowntimeSeconds, setDisplayDowntimeSeconds] = useState(0);

  const [incidentId, setIncidentId] = useState("");
  const [notice, setNotice] = useState("");
  const [, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const clearDisplayTimerRef = useRef(null);

  const subCategoryOptions = category ? subCategoryMap[category] || [] : [];
  const isOngoing = Boolean(occurredAt && !recoveredAt);

  const workerOptions = useMemo(() => {
    if (!team) return [];
    return workerMap[team] || [];
  }, [team]);

  const isLineMissing = !line;
  const isCategoryMissing = !category;
  const isSubCategoryMissing = !subCategory;
  const isTeamMissing = !team;
  const isWorkerMissing = !worker;

  useEffect(() => {
    const savedLine = localStorage.getItem(STORAGE_KEYS.line);
    const savedTeam = localStorage.getItem(STORAGE_KEYS.team);
    const savedWorker = localStorage.getItem(STORAGE_KEYS.worker);

    if (savedLine && lineOptions.includes(savedLine)) {
      setLine(savedLine);
    }

    if (savedTeam && teamOptions.includes(savedTeam)) {
      setTeam(savedTeam);

      const teamWorkers = workerMap[savedTeam] || [];
      if (savedWorker && teamWorkers.includes(savedWorker)) {
        setWorker(savedWorker);
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (category) {
      setSubCategory("");
    }
  }, [category]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!occurredAt || recoveredAt) return;
    const timer = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [occurredAt, recoveredAt]);

  useEffect(() => {
    const styleId = "occurred-blink-style";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes occurredPulse {
        0% {
          background-color: rgba(239, 68, 68, 0.08);
        }
        50% {
          background-color: rgba(239, 68, 68, 0.16);
        }
        100% {
          background-color: rgba(239, 68, 68, 0.08);
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    return () => {
      if (clearDisplayTimerRef.current) {
        clearTimeout(clearDisplayTimerRef.current);
      }
    };
  }, []);

  const liveDowntimeSeconds = calcDowntimeSeconds(occurredAt, recoveredAt);

  const shownOccurredAt = isOngoing ? occurredAt : displayOccurredAt;
  const shownRecoveredAt = isOngoing ? recoveredAt : displayRecoveredAt;
  const shownDowntimeSeconds = isOngoing ? liveDowntimeSeconds : displayDowntimeSeconds;

  const handleCategoryClick = (value) => {
    setCategory(value);
  };

  const handleTeamChange = (value) => {
    if (value === team) return;
    setTeam(value);
    setWorker("");
  };

  const validateRequiredFields = () => {
    if (!line || !category || !subCategory || !team || !worker) {
      setNotice("ライン・大項目・中項目・担当班・担当者を入力してください");
      return false;
    }
    return true;
  };

  const saveSelections = () => {
    localStorage.setItem(STORAGE_KEYS.line, line);
    localStorage.setItem(STORAGE_KEYS.team, team);
    localStorage.setItem(STORAGE_KEYS.worker, worker);
    saveRecentWorkerByTeam(team, worker);
  };

  const resetFormAfterRecovery = () => {
    setCategory("");
    setSubCategory("");
    setDetail("");
  };

  const handleRecordOccurred = async () => {
    if (!validateRequiredFields()) return;
    if (isOngoing) {
      setNotice("この案件はすでに発生中です");
      return;
    }
  
    if (clearDisplayTimerRef.current) {
      clearTimeout(clearDisplayTimerRef.current);
      clearDisplayTimerRef.current = null;
    }
  
    const occurred = getNowDateTimeString();
    const newIncidentId = `incident-${Date.now()}`;
  
    setOccurredAt(occurred);
    setRecoveredAt("");
    setIncidentId(newIncidentId);
  
    const report = {
      incidentId: newIncidentId,
      line,
      category,
      subCategory,
      team,
      worker,
      detail: detail.trim(),
      occurredAt: occurred,
      recoveredAt: "",
      downtimeSeconds: 0,
      status: "発生中",
    };
  
    try {
      onAddReport(report);
      await sendToSlack(report, "occurred");
      saveSelections();
      setNotice(`Slack送信成功: ${line} / 発生`);
    } catch (error) {
      console.error("発生投稿エラー:", error);
      setNotice(`Slack送信失敗: ${error.message}`);
    }
  };

  const handleRecordRecovered = async () => {
    if (!occurredAt || !incidentId) {
      setNotice("先に発生を登録してください");
      return;
    }
  
    if (clearDisplayTimerRef.current) {
      clearTimeout(clearDisplayTimerRef.current);
      clearDisplayTimerRef.current = null;
    }
  
    const recovered = getNowDateTimeString();
    const seconds = calcDowntimeSeconds(occurredAt, recovered);
  
    setRecoveredAt(recovered);
    setDisplayOccurredAt(occurredAt);
    setDisplayRecoveredAt(recovered);
    setDisplayDowntimeSeconds(seconds);
  
    clearDisplayTimerRef.current = setTimeout(() => {
      setOccurredAt("");
      setRecoveredAt("");
      setDisplayOccurredAt("");
      setDisplayRecoveredAt("");
      setDisplayDowntimeSeconds(0);
      setIncidentId("");
      clearDisplayTimerRef.current = null;
    }, 6000);
  
    const report = {
      incidentId,
      line,
      category,
      subCategory,
      team,
      worker,
      detail: detail.trim(),
      occurredAt,
      recoveredAt: recovered,
      downtimeSeconds: seconds,
      status: "復旧",
    };
  
    try {
      onAddReport(report);
      await sendToSlack(report, "recovered");
      saveSelections();
      setNotice(`Slack送信成功: ${line} / 復旧`);
      resetFormAfterRecovery();
    } catch (error) {
      console.error("復旧投稿エラー:", error);
      setNotice(`Slack送信失敗: ${error.message}`);
    }
  };

  const panelBg = darkMode ? theme.panelBg : "#ffffff";
  const text = darkMode ? theme.text : "#111827";
  const muted = darkMode ? theme.muted : "#64748b";
  const border = darkMode ? "#334155" : "#d1d5db";
  const inputBg = darkMode ? "#0f172a" : "#ffffff";
  const readBg = darkMode ? "#1e293b" : "#f9fafb";

  const noticeBar = notice ? (
    <div
      style={{
        backgroundColor: darkMode ? "#1e3a8a" : "#dbeafe",
        color: darkMode ? "#dbeafe" : "#1e3a8a",
        border: `1px solid ${darkMode ? "#2563eb" : "#93c5fd"}`,
        borderRadius: "12px",
        padding: "12px 14px",
        fontWeight: "700",
        fontSize: "14px",
      }}
    >
      {notice}
    </div>
  ) : null;

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div
        style={{
          backgroundColor: panelBg,
          borderRadius: "18px",
          padding: "16px",
          boxShadow: darkMode
            ? "0 12px 28px rgba(0,0,0,0.35)"
            : "0 12px 28px rgba(15, 23, 42, 0.10)",
          border: `1px solid ${darkMode ? "#1f2937" : "#e5e7eb"}`,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "14px", fontSize: "20px", color: text }}>
          入力画面
        </h2>

        <form>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={{ ...sectionLabel, color: text }}>トラブルライン</label>
              <div style={buttonGroupStyle}>
                {lineOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLine(option)}
                    style={selectButtonStyle(line === option, darkMode, isLineMissing)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ ...sectionLabel, color: text }}>エラー大項目</label>
              <div style={buttonGroupStyle}>
                {categoryOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleCategoryClick(option)}
                    style={selectButtonStyle(category === option, darkMode, isCategoryMissing)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ ...sectionLabel, color: text }}>中項目</label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                style={{
                  ...inputStyle,
                  backgroundColor: isSubCategoryMissing
                    ? darkMode
                      ? "rgba(245, 158, 11, 0.10)"
                      : "#fff9db"
                    : inputBg,
                  color: text,
                  borderColor: isSubCategoryMissing ? (darkMode ? "#f59e0b" : "#fcd34d") : border,
                  boxShadow: isSubCategoryMissing
                    ? "0 0 0 1px rgba(245, 158, 11, 0.18) inset"
                    : "none",
                }}
                disabled={!category}
              >
                <option value="">
                  {category ? "中項目を選択してください" : "先に大項目を選択してください"}
                </option>
                {subCategoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label style={{ ...sectionLabel, color: text }}>担当班</label>
                <select
                  value={team}
                  onChange={(e) => handleTeamChange(e.target.value)}
                  style={{
                    ...inputStyle,
                    backgroundColor: isTeamMissing
                      ? darkMode
                        ? "rgba(245, 158, 11, 0.10)"
                        : "#fff9db"
                      : inputBg,
                    color: text,
                    borderColor: isTeamMissing ? (darkMode ? "#f59e0b" : "#fcd34d") : border,
                    boxShadow: isTeamMissing
                      ? "0 0 0 1px rgba(245, 158, 11, 0.18) inset"
                      : "none",
                  }}
                >
                  <option value="">班を選択</option>
                  {teamOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ ...sectionLabel, color: text }}>担当者</label>
                <select
                  value={worker}
                  onChange={(e) => setWorker(e.target.value)}
                  style={{
                    ...inputStyle,
                    backgroundColor: isWorkerMissing
                      ? darkMode
                        ? "rgba(245, 158, 11, 0.10)"
                        : "#fff9db"
                      : inputBg,
                    color: text,
                    borderColor: isWorkerMissing ? (darkMode ? "#f59e0b" : "#fcd34d") : border,
                    boxShadow: isWorkerMissing
                      ? "0 0 0 1px rgba(245, 158, 11, 0.18) inset"
                      : "none",
                  }}
                  disabled={!team}
                >
                  <option value="">{team ? "担当者を選択" : "先に班を選択してください"}</option>
                  {workerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ ...sectionLabel, color: text }}>詳細</label>
              <input
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="自由記入"
                style={{ ...inputStyle, backgroundColor: inputBg, color: text, borderColor: border }}
              />
            </div>

            <div>
              <label style={{ ...sectionLabel, color: text }}>時刻記録</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                  maxWidth: "620px",
                }}
              >
                <button
                  type="button"
                  onClick={handleRecordOccurred}
                  disabled={isOngoing}
                  style={timeButtonStyle("#dc2626", isOngoing)}
                >
                  発生
                </button>
                <button
                  type="button"
                  onClick={handleRecordRecovered}
                  disabled={!isOngoing}
                  style={timeButtonStyle("#16a34a", !isOngoing)}
                >
                  復旧
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: isMobile ? "6px" : "8px",
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  ...compactInlineBoxStyle,
                  backgroundColor: isOngoing ? (darkMode ? "#3f1d1d" : "#fee2e2") : readBg,
                  borderColor: isOngoing ? "#ef4444" : border,
                  color: text,
                  animation: isOngoing ? "occurredPulse 2.4s ease-in-out infinite" : "none",
                  padding: isMobile ? "8px 8px" : "10px 10px",
                  minHeight: isMobile ? "60px" : "56px",
                }}
              >
                <span style={{ color: muted, fontWeight: 700, fontSize: isMobile ? "12px" : "13px" }}>
                  発生
                </span>
                <span style={{ fontWeight: 900, fontSize: isMobile ? "15px" : "17px" }}>
                  {toTimeOnly(shownOccurredAt)}
                </span>
              </div>

              <div
                style={{
                  ...compactInlineBoxStyle,
                  backgroundColor: readBg,
                  borderColor: border,
                  color: text,
                  padding: isMobile ? "8px 8px" : "10px 10px",
                  minHeight: isMobile ? "60px" : "56px",
                }}
              >
                <span style={{ color: muted, fontWeight: 700, fontSize: isMobile ? "12px" : "13px" }}>
                  復旧
                </span>
                <span style={{ fontWeight: 900, fontSize: isMobile ? "15px" : "17px" }}>
                  {toTimeOnly(shownRecoveredAt)}
                </span>
              </div>

              <div
                style={{
                  ...compactInlineBoxStyle,
                  background: darkMode
                    ? "linear-gradient(135deg, #172554 0%, #1e3a8a 100%)"
                    : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  borderColor: darkMode ? "#1d4ed8" : "#bfdbfe",
                  color: darkMode ? "#dbeafe" : "#1d4ed8",
                  padding: isMobile ? "8px 8px" : "10px 10px",
                  minHeight: isMobile ? "60px" : "56px",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: isMobile ? "12px" : "13px" }}>
                  停止
                </span>
                <span style={{ fontWeight: 900, fontSize: isMobile ? "15px" : "17px" }}>
                  {formatDuration(shownDowntimeSeconds)}
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {noticeBar}
    </div>
  );
}

const sectionLabel = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "700",
  fontSize: "13px",
};

const buttonGroupStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: "12px",
  padding: "12px 12px",
  fontSize: "14px",
  outline: "none",
  minHeight: "46px",
  border: "1px solid",
};

const compactInlineBoxStyle = {
  border: "1px solid",
  borderRadius: "12px",
  padding: "10px 10px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "2px",
  minHeight: "56px",
  minWidth: 0,
  overflow: "hidden",
};

function selectButtonStyle(active, darkMode, missing = false) {
  return {
    padding: "13px 16px",
    borderRadius: "999px",
    border: active
      ? "2px solid #93c5fd"
      : missing
        ? `1px solid ${darkMode ? "#f59e0b" : "#fcd34d"}`
        : `1px solid ${darkMode ? "#334155" : "#cbd5e1"}`,
    backgroundColor: active
      ? "#2563eb"
      : missing
        ? darkMode
          ? "rgba(245, 158, 11, 0.10)"
          : "#fff9db"
        : darkMode
          ? "#0f172a"
          : "#ffffff",
    color: active ? "#ffffff" : darkMode ? "#e5e7eb" : "#0f172a",
    fontWeight: "800",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: "46px",
    boxShadow: missing && !active
      ? "0 0 0 1px rgba(245, 158, 11, 0.18) inset"
      : "none",
  };
}

function timeButtonStyle(color, disabled = false) {
  return {
    minHeight: "50px",
    borderRadius: "14px",
    border: "none",
    backgroundColor: disabled ? "#94a3b8" : color,
    color: "#fff",
    fontWeight: "900",
    fontSize: "16px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
  };
}