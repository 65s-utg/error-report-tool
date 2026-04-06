import React, { useEffect, useMemo, useState } from "react";

const lineOptions = ["G3", "M5", "M6", "M7", "M8", "M9"];
const teamOptions = ["A班", "B班", "C班", "D班"];

const workerMap = {
  A班: ["佐藤", "鈴木", "高橋", "田中", "伊藤", "渡辺"],
  B班: ["山本", "中村", "小林", "加藤", "吉田", "山田"],
  C班: ["松本", "井上", "木村", "林", "清水", "山崎"],
  D班: ["森", "池田", "橋本", "阿部", "石川", "山口"],
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
  const [notice, setNotice] = useState("");
  const [tick, setTick] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);

  const subCategoryOptions = category ? subCategoryMap[category] || [] : [];
  const isOngoing = Boolean(occurredAt && !recoveredAt);

  const workerOptions = useMemo(() => {
    if (!team) return [];

    const base = workerMap[team] || [];
    const recentByTeam = getRecentWorkersByTeam();
    const recent = Array.isArray(recentByTeam[team]) ? recentByTeam[team] : [];

    let sorted = [
      ...recent.filter((name) => base.includes(name)),
      ...base.filter((name) => !recent.includes(name)),
    ];

    if (worker && sorted.includes(worker)) {
      sorted = [worker, ...sorted.filter((name) => name !== worker)];
    }

    return sorted;
  }, [team, worker]);

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
    if (!isMobile) {
      setSubCategoryOpen(true);
    } else {
      setSubCategoryOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (category) {
      setSubCategory("");
      if (isMobile) {
        setSubCategoryOpen(true);
      }
    }
  }, [category, isMobile]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
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
          background-color: rgba(239, 68, 68, 0.22);
        }
        100% {
          background-color: rgba(239, 68, 68, 0.08);
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const downtimeSeconds = useMemo(() => {
    return calcDowntimeSeconds(occurredAt, recoveredAt);
  }, [occurredAt, recoveredAt, tick]);

  const handleCategoryClick = (value) => {
    setCategory(value);
  };

  const handleRecordOccurred = () => {
    setOccurredAt(getNowDateTimeString());
    setRecoveredAt("");
  };

  const handleRecordRecovered = () => {
    setRecoveredAt(getNowDateTimeString());
  };

  const handleTeamChange = (value) => {
    if (value === team) return;
    setTeam(value);
    setWorker("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!line || !category || !subCategory) {
      setNotice("トラブルライン・大項目・中項目は必須です");
      return;
    }

    const report = {
      line,
      category,
      subCategory,
      team,
      worker,
      detail: detail.trim(),
      occurredAt,
      recoveredAt,
      downtimeSeconds,
    };

    onAddReport(report);

    localStorage.setItem(STORAGE_KEYS.line, line);
    localStorage.setItem(STORAGE_KEYS.team, team);
    localStorage.setItem(STORAGE_KEYS.worker, worker);
    saveRecentWorkerByTeam(team, worker);

    setNotice(`Slackの${line}チャンネルに登録されました`);

    setCategory("");
    setSubCategory("");
    setDetail("");
    setOccurredAt("");
    setRecoveredAt("");

    if (isMobile) {
      setSubCategoryOpen(false);
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
      {!isMobile ? noticeBar : null}

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

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={{ ...sectionLabel, color: text }}>トラブルライン</label>
              <div style={buttonGroupStyle}>
                {lineOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLine(option)}
                    style={selectButtonStyle(line === option, darkMode)}
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
                    style={selectButtonStyle(category === option, darkMode)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {isMobile ? (
              <div>
                <button
                  type="button"
                  onClick={() => setSubCategoryOpen((prev) => !prev)}
                  style={{
                    width: "100%",
                    minHeight: "46px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: `1px solid ${border}`,
                    backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                    color: text,
                    fontWeight: 800,
                    fontSize: "14px",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {subCategoryOpen ? "中項目を閉じる" : "中項目を開く"}
                  {subCategory ? `：${subCategory}` : ""}
                </button>

                {subCategoryOpen ? (
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ ...sectionLabel, color: text }}>中項目</label>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      style={{ ...inputStyle, backgroundColor: inputBg, color: text, borderColor: border }}
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
                ) : null}
              </div>
            ) : (
              <div>
                <label style={{ ...sectionLabel, color: text }}>中項目</label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  style={{ ...inputStyle, backgroundColor: inputBg, color: text, borderColor: border }}
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
            )}

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
                  style={{ ...inputStyle, backgroundColor: inputBg, color: text, borderColor: border }}
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
                  style={{ ...inputStyle, backgroundColor: inputBg, color: text, borderColor: border }}
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
                  style={timeButtonStyle("#dc2626")}
                >
                  発生
                </button>
                <button
                  type="button"
                  onClick={handleRecordRecovered}
                  style={timeButtonStyle("#16a34a")}
                >
                  復旧
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
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
                }}
              >
                <span style={{ color: muted, fontWeight: 700, fontSize: "11px" }}>発生</span>
                <span style={{ fontWeight: 900, fontSize: "15px" }}>{toTimeOnly(occurredAt)}</span>
              </div>

              <div
                style={{
                  ...compactInlineBoxStyle,
                  backgroundColor: readBg,
                  borderColor: border,
                  color: text,
                }}
              >
                <span style={{ color: muted, fontWeight: 700, fontSize: "11px" }}>復旧</span>
                <span style={{ fontWeight: 900, fontSize: "15px" }}>{toTimeOnly(recoveredAt)}</span>
              </div>

              <div
                style={{
                  ...compactInlineBoxStyle,
                  background: darkMode
                    ? "linear-gradient(135deg, #172554 0%, #1e3a8a 100%)"
                    : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  borderColor: darkMode ? "#1d4ed8" : "#bfdbfe",
                  color: darkMode ? "#dbeafe" : "#1d4ed8",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: "11px" }}>停止</span>
                <span style={{ fontWeight: 900, fontSize: "15px" }}>{formatDuration(downtimeSeconds)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button type="submit" style={primaryButtonStyle}>
                報告
              </button>
            </div>
          </div>
        </form>
      </div>

      {isMobile ? noticeBar : null}
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
};

const primaryButtonStyle = {
  padding: "13px 20px",
  borderRadius: "999px",
  border: "none",
  backgroundColor: "#2563eb",
  color: "#fff",
  fontWeight: "800",
  fontSize: "15px",
  cursor: "pointer",
  minHeight: "50px",
  minWidth: "140px",
};

function selectButtonStyle(active, darkMode) {
  return {
    padding: "13px 16px",
    borderRadius: "999px",
    border: active ? "2px solid #93c5fd" : `1px solid ${darkMode ? "#475569" : "#d1d5db"}`,
    backgroundColor: active ? "#2563eb" : darkMode ? "#0f172a" : "#ffffff",
    color: active ? "#ffffff" : darkMode ? "#e5e7eb" : "#111827",
    fontWeight: "800",
    cursor: "pointer",
    minHeight: "48px",
    minWidth: "96px",
    fontSize: "15px",
  };
}

function timeButtonStyle(color) {
  return {
    width: "100%",
    padding: "15px 20px",
    borderRadius: "16px",
    border: "none",
    backgroundColor: color,
    color: "#fff",
    fontWeight: "900",
    fontSize: "17px",
    cursor: "pointer",
    minHeight: "56px",
  };
}