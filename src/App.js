import React, { useMemo, useState } from "react";
import InputScreen from "./InputScreen";
import AnalysisScreen from "./AnalysisScreen";

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
};

const workers = ["担当者A", "担当者B", "担当者C", "担当者D", "担当者E", "担当者F", "担当者G"];
const teams = ["A班", "B班", "C班", "D班"];

const detailTemplates = {
  ラベラー: ["ラベル供給が不安定", "貼付位置ズレを確認", "ラベル巻き込み発生", "センサーでラベルを拾えない", "立上げ後に再発あり"],
  実ボトル: ["供給部で詰まり発生", "倒れビンを確認", "流れが不安定", "入口側で滞留あり", "連続で数本取りこぼし"],
  キャップIJP: ["印字が薄い", "一部印字欠けあり", "印字位置ずれ確認", "インク系統確認必要", "立上げ後に再確認"],
  コンベア: ["搬送途中で停止", "ガイド接触音あり", "センサー反応不安定", "一時的に蛇行発生", "速度変動あり"],
  シュリンク: ["フィルム位置ズレ", "収縮不足を確認", "フィルム供給不安定", "シール部不良あり", "立上げ後も監視継続"],
  ケーサー: ["箱成形が不安定", "投入タイミングずれ", "吸着ミスあり", "ケース投入部で詰まり", "再起動で一旦復旧"],
  ケースIJP: ["ケース印字が薄い", "印字位置ずれあり", "一部未印字発生", "インク残量要確認", "ケース検出不安定"],
};

function formatDateTime(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}

function pickWeightedLine(index) {
  const table = ["G3", "G3", "G3", "M5", "M5", "M6", "M6", "M7", "M8", "M9"];
  return table[index % table.length];
}

function pickWeightedCategory(index) {
  const table = [
    "ラベラー",
    "ラベラー",
    "ラベラー",
    "コンベア",
    "コンベア",
    "実ボトル",
    "キャップIJP",
    "シュリンク",
    "ケーサー",
    "ケースIJP",
  ];
  return table[(index * 3) % table.length];
}

function buildSampleReports() {
  const now = new Date();
  const samples = [];
  let id = 1;

  for (let i = 0; i < 1080; i += 1) {
    const line = pickWeightedLine(i);
    const category = pickWeightedCategory(i);
    const subList = subCategoryMap[category];
    const subCategory = subList[(i * 5 + 2) % subList.length];
    const worker = workers[(i * 7 + 1) % workers.length];
    const team = teams[(i * 11 + 2) % teams.length];

    const daysOffset = (i * 13 + (i % 17) * 5) % 180;
    const hoursOffset = (i * 11 + (i % 5) * 3 + (i % 23)) % 24;
    const minutesOffset = (i * 17 + (i % 9) * 4 + (i % 29)) % 60;
    const secondsOffset = (i * 19 + (i % 7) * 6 + (i % 31)) % 60;

    const occurred = new Date(now);
    occurred.setDate(occurred.getDate() - daysOffset);
    occurred.setHours(hoursOffset, minutesOffset, secondsOffset, 0);

    const downtimeSecondsBase =
      category === "ラベラー"
        ? 180 + (i % 9) * 95 + (i % 4) * 21
        : category === "コンベア"
        ? 240 + (i % 10) * 110 + (i % 3) * 35
        : category === "シュリンク"
        ? 150 + (i % 8) * 85 + (i % 5) * 17
        : 90 + (i % 12) * 70 + (i % 6) * 14;

    const jitter = ((i * 37) % 97) - 48;
    const downtimeSeconds = Math.max(45, downtimeSecondsBase + jitter);

    const unresolved = i % 8 === 0 || i % 29 === 0;
    const recovered = unresolved ? null : new Date(occurred.getTime() + downtimeSeconds * 1000);

    const detailBase = detailTemplates[category][(i * 2 + 3) % detailTemplates[category].length];
    const extra =
      i % 10 === 0 ? " 要監視" :
      i % 7 === 0 ? " 再発あり" :
      i % 6 === 0 ? " 現場確認済" : "";

    samples.push({
      id: id++,
      incidentId: `sample-${id}`,
      line,
      category,
      subCategory,
      team,
      worker,
      detail: `${detailBase}${extra}`,
      occurredAt: formatDateTime(occurred),
      recoveredAt: recovered ? formatDateTime(recovered) : "",
      downtimeSeconds: recovered ? downtimeSeconds : 0,
      status: recovered ? "復旧" : "発生中",
    });
  }

  return samples.sort(
    (a, b) =>
      new Date(b.occurredAt.replace(" ", "T")) -
      new Date(a.occurredAt.replace(" ", "T"))
  );
}

export default function App() {
  const [screen, setScreen] = useState("input");
  const [darkMode, setDarkMode] = useState(false);
  const initialReports = useMemo(() => buildSampleReports(), []);
  const [reports, setReports] = useState(initialReports);

  const theme = darkMode
    ? {
        pageBg: "#0b1220",
        panelBg: "#111827",
        panelBgSoft: "#1f2937",
        panelBorder: "#334155",
        text: "#f8fafc",
        muted: "#cbd5e1",
        topBg: "linear-gradient(135deg, #020617 0%, #111827 100%)",
        buttonIdle: "#0f172a",
      }
    : {
        pageBg: "#eef2f7",
        panelBg: "#ffffff",
        panelBgSoft: "#f8fafc",
        panelBorder: "#e2e8f0",
        text: "#0f172a",
        muted: "#64748b",
        topBg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        buttonIdle: "#0f172a",
      };

  const handleAddReport = (report) => {
    setReports((prev) => {
      const existingIndex = prev.findIndex((item) => item.incidentId === report.incidentId);

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...report,
        };

        return updated.sort(
          (a, b) =>
            new Date(b.occurredAt.replace(" ", "T")) -
            new Date(a.occurredAt.replace(" ", "T"))
        );
      }

      return [
        {
          id: Date.now(),
          ...report,
        },
        ...prev,
      ].sort(
        (a, b) =>
          new Date(b.occurredAt.replace(" ", "T")) -
          new Date(a.occurredAt.replace(" ", "T"))
      );
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: theme.pageBg,
        padding: "16px 12px 32px",
        boxSizing: "border-box",
        transition: "background-color 0.2s ease",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div
          style={{
            background: theme.topBg,
            color: "#ffffff",
            borderRadius: "20px",
            padding: "16px 18px",
            marginBottom: "16px",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "24px" }}>エラー報告ツール</h1>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: "1px solid #475569",
                  backgroundColor: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {darkMode ? "ライトモード" : "ダークモード"}
              </button>

              <button
                type="button"
                onClick={() => setScreen("input")}
                style={{
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: screen === "input" ? "2px solid #93c5fd" : "1px solid #334155",
                  backgroundColor: screen === "input" ? "#2563eb" : theme.buttonIdle,
                  color: "#fff",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                入力画面
              </button>

              <button
                type="button"
                onClick={() => setScreen("analysis")}
                style={{
                  padding: "10px 16px",
                  borderRadius: "999px",
                  border: screen === "analysis" ? "2px solid #93c5fd" : "1px solid #334155",
                  backgroundColor: screen === "analysis" ? "#2563eb" : theme.buttonIdle,
                  color: "#fff",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                分析画面
              </button>
            </div>
          </div>
        </div>

        {screen === "input" ? (
          <InputScreen
            onGoAnalysis={() => setScreen("analysis")}
            onAddReport={handleAddReport}
            darkMode={darkMode}
            theme={theme}
          />
        ) : (
          <AnalysisScreen
            reports={reports}
            onBack={() => setScreen("input")}
            darkMode={darkMode}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}