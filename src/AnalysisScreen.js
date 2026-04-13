import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "-";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}分${sec}秒`;
}

function toDate(value) {
  return new Date(value.replace(" ", "T"));
}

function toInputDateTimeLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function getTopItemsByLine(reports) {
  const grouped = {};
  reports.forEach((r) => {
    const line = r.line || "未設定";
    const item = r.category || "未設定";
    if (!grouped[line]) grouped[line] = {};
    grouped[line][item] = (grouped[line][item] || 0) + 1;
  });

  return Object.entries(grouped)
    .map(([line, counts]) => {
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const [topItem, topCount] = sorted[0] || ["-", 0];
      return { line, topItem, topCount };
    })
    .sort((a, b) => b.topCount - a.topCount);
}

export default function AnalysisScreen({ reports, onBack, darkMode, theme }) {
  const [rangeType, setRangeType] = useState("12h");
  const [lineFilter, setLineFilter] = useState("全ライン");
  const [categoryFilter, setCategoryFilter] = useState("全項目");
  const [subCategoryFilter, setSubCategoryFilter] = useState("全中項目");
  const [teamFilter, setTeamFilter] = useState("全班");
  const [workerFilter, setWorkerFilter] = useState("全担当者");
  const [chartMode, setChartMode] = useState("count");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const now = new Date();
  const defaultStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [customStart, setCustomStart] = useState(toInputDateTimeLocal(defaultStart));
  const [customEnd, setCustomEnd] = useState(toInputDateTimeLocal(now));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const allLines = useMemo(
    () => ["全ライン", ...Array.from(new Set(reports.map((r) => r.line).filter(Boolean)))],
    [reports]
  );

  const allCategories = useMemo(
    () => ["全項目", ...Array.from(new Set(reports.map((r) => r.category).filter(Boolean)))],
    [reports]
  );

  const allSubCategories = useMemo(
    () => ["全中項目", ...Array.from(new Set(reports.map((r) => r.subCategory).filter(Boolean)))],
    [reports]
  );

  const allTeams = useMemo(
    () => ["全班", ...Array.from(new Set(reports.map((r) => r.team).filter(Boolean)))],
    [reports]
  );

  const allWorkers = useMemo(
    () => ["全担当者", ...Array.from(new Set(reports.map((r) => r.worker).filter(Boolean)))],
    [reports]
  );

  const rangeWindow = useMemo(() => {
    const current = new Date();
    let start = null;
    let end = null;

    if (rangeType === "12h") {
      start = new Date(current.getTime() - 12 * 60 * 60 * 1000);
      end = current;
    } else if (rangeType === "7d") {
      start = new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = current;
    } else if (rangeType === "1m") {
      start = new Date(current);
      start.setMonth(start.getMonth() - 1);
      end = current;
    } else if (rangeType === "3m") {
      start = new Date(current);
      start.setMonth(start.getMonth() - 3);
      end = current;
    } else if (rangeType === "custom") {
      start = customStart ? new Date(customStart) : null;
      end = customEnd ? new Date(customEnd) : null;
    }

    return { start, end };
  }, [rangeType, customStart, customEnd]);

  const filteredReports = useMemo(() => {
    const { start, end } = rangeWindow;

    return reports.filter((report) => {
      const occurred = toDate(report.occurredAt);

      const matchesRange =
        (!start || occurred >= start) && (!end || occurred <= end);

      const matchesLine =
        lineFilter === "全ライン" || report.line === lineFilter;

      const matchesCategory =
        categoryFilter === "全項目" || report.category === categoryFilter;

      const matchesSubCategory =
        subCategoryFilter === "全中項目" || report.subCategory === subCategoryFilter;

      const matchesTeam =
        teamFilter === "全班" || report.team === teamFilter;

      const matchesWorker =
        workerFilter === "全担当者" || report.worker === workerFilter;

      return (
        matchesRange &&
        matchesLine &&
        matchesCategory &&
        matchesSubCategory &&
        matchesTeam &&
        matchesWorker
      );
    });
  }, [
    reports,
    rangeWindow,
    lineFilter,
    categoryFilter,
    subCategoryFilter,
    teamFilter,
    workerFilter,
  ]);

  const previousFilteredReports = useMemo(() => {
    const { start, end } = rangeWindow;
    if (!start || !end) return [];

    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start);

    return reports.filter((report) => {
      const occurred = toDate(report.occurredAt);

      const matchesRange = occurred >= prevStart && occurred < prevEnd;
      const matchesLine = lineFilter === "全ライン" || report.line === lineFilter;
      const matchesCategory = categoryFilter === "全項目" || report.category === categoryFilter;
      const matchesSubCategory =
        subCategoryFilter === "全中項目" || report.subCategory === subCategoryFilter;
      const matchesTeam = teamFilter === "全班" || report.team === teamFilter;
      const matchesWorker = workerFilter === "全担当者" || report.worker === workerFilter;

      return (
        matchesRange &&
        matchesLine &&
        matchesCategory &&
        matchesSubCategory &&
        matchesTeam &&
        matchesWorker
      );
    });
  }, [
    reports,
    rangeWindow,
    lineFilter,
    categoryFilter,
    subCategoryFilter,
    teamFilter,
    workerFilter,
  ]);

  const totalCount = filteredReports.length;
  const totalDowntimeSeconds = filteredReports.reduce(
    (sum, report) => sum + (Number(report.downtimeSeconds) || 0),
    0
  );
  const recoveredCount = filteredReports.filter((report) => report.recoveredAt).length;
  const averageDowntimeSeconds =
    totalCount > 0 ? Math.round(totalDowntimeSeconds / totalCount) : 0;

  const prevCount = previousFilteredReports.length;
  const prevDowntimeSeconds = previousFilteredReports.reduce(
    (sum, report) => sum + (Number(report.downtimeSeconds) || 0),
    0
  );

  const countDiff = totalCount - prevCount;
  const timeDiff = totalDowntimeSeconds - prevDowntimeSeconds;

  const lineChartData = allLines
    .filter((line) => line !== "全ライン")
    .map((line) => {
      const target = filteredReports.filter((r) => r.line === line);
      const count = target.length;
      const seconds = target.reduce((sum, r) => sum + (Number(r.downtimeSeconds) || 0), 0);
      return {
        name: line,
        count,
        seconds,
        display: chartMode === "count" ? count : Math.round(seconds / 60),
      };
    });

  const categoryChartData = allCategories
    .filter((category) => category !== "全項目")
    .map((category) => {
      const target = filteredReports.filter((r) => r.category === category);
      const count = target.length;
      const seconds = target.reduce((sum, r) => sum + (Number(r.downtimeSeconds) || 0), 0);
      return {
        name: category,
        count,
        seconds,
        display: chartMode === "count" ? count : Math.round(seconds / 60),
      };
    });

  const visibleReports = filteredReports.slice(0, 20);
  const topItemsByLine = getTopItemsByLine(filteredReports);

  const panelBg = darkMode ? theme.panelBg : "#ffffff";
  const border = darkMode ? "#334155" : "#e2e8f0";
  const text = darkMode ? theme.text : "#0f172a";
  const muted = darkMode ? theme.muted : "#64748b";
  const selectBg = darkMode ? "#0f172a" : "#ffffff";
  const tableHeadBg = darkMode ? "#1f2937" : "#f8fafc";

  const countTrendText =
    countDiff > 0
      ? `前期間比で件数は ${countDiff}件 増加`
      : countDiff < 0
      ? `前期間比で件数は ${Math.abs(countDiff)}件 減少`
      : "前期間比で件数は横ばい";

  const timeTrendText =
    timeDiff > 0
      ? `総停止時間は ${formatDuration(timeDiff)} 増加`
      : timeDiff < 0
      ? `総停止時間は ${formatDuration(Math.abs(timeDiff))} 減少`
      : "総停止時間は横ばい";

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: "10px",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <h2 style={{ margin: 0, fontSize: isMobile ? "19px" : "21px", color: text }}>
          分析画面
        </h2>

        <button type="button" onClick={onBack} style={darkButtonStyle}>
          入力画面へ戻る
        </button>
      </div>

      <div
        style={{
          background: darkMode
            ? "linear-gradient(135deg, #111827 0%, #1f2937 100%)"
            : "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.96) 100%)",
          borderRadius: "18px",
          padding: "14px",
          boxShadow: darkMode
            ? "0 16px 30px rgba(0,0,0,0.32)"
            : "0 16px 30px rgba(15, 23, 42, 0.08)",
          border: `1px solid ${border}`,
        }}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <div style={{ ...filterLabelStyle, color: text }}>期間</div>
            <div style={buttonWrapStyle}>
              <button type="button" onClick={() => setRangeType("12h")} style={rangeButtonStyle(rangeType === "12h", darkMode)}>過去12時間</button>
              <button type="button" onClick={() => setRangeType("7d")} style={rangeButtonStyle(rangeType === "7d", darkMode)}>過去7日間</button>
              <button type="button" onClick={() => setRangeType("1m")} style={rangeButtonStyle(rangeType === "1m", darkMode)}>過去1か月</button>
              <button type="button" onClick={() => setRangeType("3m")} style={rangeButtonStyle(rangeType === "3m", darkMode)}>過去3か月</button>
              <button type="button" onClick={() => setRangeType("custom")} style={rangeButtonStyle(rangeType === "custom", darkMode)}>期間指定</button>
              <button type="button" onClick={() => setRangeType("all")} style={rangeButtonStyle(rangeType === "all", darkMode)}>全期間</button>
            </div>
          </div>

          {rangeType === "custom" ? (
            <div style={filterGridStyle}>
              <div>
                <div style={{ ...filterLabelStyle, color: text }}>開始</div>
                <input
                  type="datetime-local"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{ ...inputStyle, backgroundColor: selectBg, color: text, borderColor: border }}
                />
              </div>
              <div>
                <div style={{ ...filterLabelStyle, color: text }}>終了</div>
                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{ ...inputStyle, backgroundColor: selectBg, color: text, borderColor: border }}
                />
              </div>
            </div>
          ) : null}

          <div style={filterGridStyle}>
            <div>
              <div style={{ ...filterLabelStyle, color: text }}>ライン</div>
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                style={{ ...inputStyle, backgroundColor: selectBg, color: text, borderColor: border }}
              >
                {allLines.map((line) => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ ...filterLabelStyle, color: text }}>大項目</div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ ...inputStyle, backgroundColor: selectBg, color: text, borderColor: border }}
              >
                {allCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ ...filterLabelStyle, color: text }}>中項目</div>
              <select
                value={subCategoryFilter}
                onChange={(e) => setSubCategoryFilter(e.target.value)}
                style={{ ...inputStyle, backgroundColor: selectBg, color: text, borderColor: border }}
              >
                {allSubCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ ...filterLabelStyle, color: text }}>担当班</div>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                style={{ ...inputStyle, backgroundColor: selectBg, color: text, borderColor: border }}
              >
                {allTeams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ ...filterLabelStyle, color: text }}>担当者</div>
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                style={{ ...inputStyle, backgroundColor: selectBg, color: text, borderColor: border }}
              >
                {allWorkers.map((worker) => (
                  <option key={worker} value={worker}>{worker}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div style={{ ...filterLabelStyle, color: text }}>表示タブ</div>
            <div style={buttonWrapStyle}>
              <button type="button" onClick={() => setChartMode("count")} style={rangeButtonStyle(chartMode === "count", darkMode)}>件数</button>
              <button type="button" onClick={() => setChartMode("time")} style={rangeButtonStyle(chartMode === "time", darkMode)}>時間</button>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          background: panelBg,
          borderRadius: "18px",
          padding: "16px 18px",
          border: `1px solid ${border}`,
          boxShadow: darkMode
            ? "0 10px 24px rgba(0,0,0,0.25)"
            : "0 10px 24px rgba(15, 23, 42, 0.05)",
        }}
      >
        <div
          style={{
            color: text,
            fontWeight: 900,
            marginBottom: "10px",
            fontSize: isMobile ? "17px" : "19px",
            lineHeight: 1.5,
          }}
        >
          選択期間レポート
        </div>

        <div
          style={{
            color: text,
            lineHeight: 1.9,
            fontSize: isMobile ? "14px" : "15px",
            fontWeight: 600,
          }}
        >
          <div style={{ marginBottom: "8px" }}>
            {countTrendText}。{timeTrendText}。
            {totalCount > 0
              ? ` 現在の平均停止時間は ${formatDuration(averageDowntimeSeconds)} です。`
              : " 現在の該当データはありません。"}
          </div>

          {topItemsByLine.length > 0 ? (
            <div style={{ color: muted, fontSize: isMobile ? "13px" : "14px" }}>
              {topItemsByLine.slice(0, 6).map((item) => (
                <div key={item.line} style={{ marginBottom: "4px" }}>
                  <strong style={{ color: text }}>{item.line}</strong>
                  {" では "}
                  <strong style={{ color: text }}>{item.topItem}</strong>
                  {" が "}
                  <strong style={{ color: text }}>{item.topCount}件</strong>
                  {" で最多です。"}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={heroStatsGridStyle}>
        <HeroStatCard title="トラブル発生件数" value={`${totalCount}件`} accent="blue" darkMode={darkMode} />
        <HeroStatCard title="総停止時間（損失時間）" value={formatDuration(totalDowntimeSeconds)} accent="indigo" darkMode={darkMode} />
        <HeroStatCard title="復旧完了件数" value={`${recoveredCount}件`} accent="green" darkMode={darkMode} />
        <HeroStatCard title="1件あたり平均停止時間" value={formatDuration(averageDowntimeSeconds)} accent="amber" darkMode={darkMode} />
      </div>

      <div style={chartGridStyle}>
        <div
          style={{
            background: panelBg,
            borderRadius: "18px",
            padding: "16px",
            boxShadow: darkMode
              ? "0 16px 30px rgba(0,0,0,0.24)"
              : "0 16px 30px rgba(15, 23, 42, 0.06)",
            border: `1px solid ${border}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "8px" }}>
            <div style={{ fontWeight: 900, color: text, fontSize: "16px" }}>ライン別 {chartMode === "count" ? "件数" : "停止時間(分)"}</div>
            <span style={miniBadgeStyle}>{chartMode === "count" ? "件数" : "時間"}</span>
          </div>

          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name, item) => {
                    if (chartMode === "count") return [`${value}件`, "件数"];
                    return [`${item?.payload?.seconds ? formatDuration(item.payload.seconds) : "-"}`, "停止時間"];
                  }}
                />
                <Bar dataKey="display" radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="display" position="top" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            background: panelBg,
            borderRadius: "18px",
            padding: "16px",
            boxShadow: darkMode
              ? "0 16px 30px rgba(0,0,0,0.24)"
              : "0 16px 30px rgba(15, 23, 42, 0.06)",
            border: `1px solid ${border}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", gap: "8px" }}>
            <div style={{ fontWeight: 900, color: text, fontSize: "16px" }}>大項目別 {chartMode === "count" ? "件数" : "停止時間(分)"}</div>
            <span style={miniBadgeStyle}>{chartMode === "count" ? "件数" : "時間"}</span>
          </div>

          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name, item) => {
                    if (chartMode === "count") return [`${value}件`, "件数"];
                    return [`${item?.payload?.seconds ? formatDuration(item.payload.seconds) : "-"}`, "停止時間"];
                  }}
                />
                <Bar dataKey="display" radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="display" position="top" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div
        style={{
          background: panelBg,
          borderRadius: "18px",
          padding: "16px",
          border: `1px solid ${border}`,
          boxShadow: darkMode
            ? "0 16px 30px rgba(0,0,0,0.24)"
            : "0 16px 30px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div style={{ fontWeight: 900, color: text, fontSize: "16px", marginBottom: "14px" }}>
          直近データ
        </div>

        {isMobile ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {visibleReports.map((report, idx) => (
              <div
                key={report.id || report.incidentId || `${report.occurredAt}-${idx}`}
                style={{
                  border: `1px solid ${border}`,
                  borderRadius: "14px",
                  padding: "12px",
                  backgroundColor: darkMode ? "#0f172a" : "#ffffff",
                }}
              >
                <div style={reportTopRowStyle}>
                  <span style={badgeStyle}>{report.line || "-"}</span>
                  <span style={{ ...smallMutedStyle, color: muted }}>
                    {report.recoveredAt ? "復旧済み" : "発生中"}
                  </span>
                </div>

                <div style={{ ...reportTitleStyle, color: text }}>
                  {(report.category || "-")} / {(report.subCategory || "-")}
                </div>

                <div style={{ ...reportDetailStyle, color: text }}>
                  {report.detail || "-"}
                </div>

                <div style={{ ...reportMetaStyle, color: muted }}>
                  <div>班: {report.team || "-"}</div>
                  <div>担当者: {report.worker || "-"}</div>
                  <div>発生: {report.occurredAt || "-"}</div>
                  <div>復旧: {report.recoveredAt || "-"}</div>
                  <div>停止時間: {formatDuration(report.downtimeSeconds)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              overflowY: "auto",
              borderRadius: "14px",
              border: `1px solid ${border}`,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1180px",
                fontSize: "14px",
              }}
            >
              <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr style={{ backgroundColor: tableHeadBg }}>
                  <th style={{ ...thStyle, color: text }}>ライン</th>
                  <th style={{ ...thStyle, color: text }}>大項目</th>
                  <th style={{ ...thStyle, color: text }}>中項目</th>
                  <th style={{ ...thStyle, color: text }}>班</th>
                  <th style={{ ...thStyle, color: text }}>担当者</th>
                  <th style={{ ...thStyle, color: text }}>詳細</th>
                  <th style={{ ...thStyle, color: text }}>発生</th>
                  <th style={{ ...thStyle, color: text }}>復旧</th>
                  <th style={{ ...thStyle, color: text }}>停止時間</th>
                </tr>
              </thead>
              <tbody>
                {visibleReports.map((report, idx) => (
                  <tr key={report.id || report.incidentId || `${report.occurredAt}-${idx}`}>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{report.line || "-"}</td>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{report.category || "-"}</td>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{report.subCategory || "-"}</td>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{report.team || "-"}</td>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{report.worker || "-"}</td>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{report.detail || "-"}</td>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{report.occurredAt || "-"}</td>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{report.recoveredAt || "-"}</td>
                    <td style={{ ...tdStyle, color: text, backgroundColor: panelBg }}>{formatDuration(report.downtimeSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStatCard({ title, value, accent, darkMode }) {
  const accentMap = {
    blue: {
      bg: "#eff6ff",
      valueColor: "#1d4ed8",
      titleColor: "#1e3a8a",
      darkValueColor: "#ffffff",
      darkTitleColor: "#e5e7eb",
      borderColor: "#bfdbfe",
    },
    indigo: {
      bg: "#eef2ff",
      valueColor: "#4338ca",
      titleColor: "#312e81",
      darkValueColor: "#ffffff",
      darkTitleColor: "#e5e7eb",
      borderColor: "#c7d2fe",
    },
    green: {
      bg: "#ecfdf5",
      valueColor: "#16a34a",
      titleColor: "#166534",
      darkValueColor: "#ffffff",
      darkTitleColor: "#e5e7eb",
      borderColor: "#bbf7d0",
    },
    amber: {
      bg: "#fffbeb",
      valueColor: "#d97706",
      titleColor: "#92400e",
      darkValueColor: "#ffffff",
      darkTitleColor: "#e5e7eb",
      borderColor: "#fde68a",
    },
  };

  const palette = accentMap[accent] || accentMap.blue;

  return (
    <div
      style={{
        background: darkMode
          ? "linear-gradient(135deg, #111827 0%, #1f2937 100%)"
          : palette.bg,
        borderRadius: "18px",
        padding: "18px",
        border: darkMode
          ? "1px solid #334155"
          : `1px solid ${palette.borderColor}`,
        boxShadow: darkMode
          ? "0 14px 24px rgba(0,0,0,0.25)"
          : "0 14px 24px rgba(15, 23, 42, 0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "8px",
        minHeight: "96px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: "900",
          letterSpacing: "0.01em",
          color: darkMode ? palette.darkTitleColor : palette.titleColor,
          lineHeight: 1.35,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: "30px",
          fontWeight: "900",
          color: darkMode ? palette.darkValueColor : palette.valueColor,
          lineHeight: 1.15,
          letterSpacing: "0.01em",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const miniBadgeStyle = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: "999px",
  backgroundColor: "#eff6ff",
  color: "#2563eb",
  fontWeight: "800",
  fontSize: "10px",
  letterSpacing: "0.04em",
};

const darkButtonStyle = {
  padding: "12px 18px",
  borderRadius: "999px",
  border: "none",
  backgroundColor: "#0f172a",
  color: "#fff",
  fontWeight: "700",
  fontSize: "14px",
  cursor: "pointer",
  minHeight: "48px",
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top",
};

const buttonWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const filterLabelStyle = {
  marginBottom: "6px",
  fontWeight: "800",
  fontSize: "12px",
};

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
};

const heroStatsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};

const chartGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
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

const reportTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  marginBottom: "8px",
};

const badgeStyle = {
  display: "inline-block",
  padding: "4px 9px",
  borderRadius: "999px",
  backgroundColor: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: "800",
  fontSize: "11px",
};

const smallMutedStyle = {
  fontSize: "11px",
  fontWeight: "700",
};

const reportTitleStyle = {
  fontWeight: "800",
  marginBottom: "6px",
  lineHeight: 1.35,
  fontSize: "14px",
};

const reportDetailStyle = {
  fontSize: "13px",
  marginBottom: "8px",
  lineHeight: 1.45,
};

const reportMetaStyle = {
  display: "grid",
  gap: "4px",
  fontSize: "11px",
  lineHeight: 1.45,
};

function rangeButtonStyle(active, darkMode) {
  return {
    padding: "10px 14px",
    borderRadius: "999px",
    border: active ? "2px solid #93c5fd" : `1px solid ${darkMode ? "#334155" : "#cbd5e1"}`,
    backgroundColor: active ? "#2563eb" : darkMode ? "#0f172a" : "#ffffff",
    color: active ? "#ffffff" : darkMode ? "#e5e7eb" : "#0f172a",
    fontWeight: "800",
    fontSize: "13px",
    cursor: "pointer",
    minHeight: "42px",
  };
}