import React, { useState } from "react";

export default function InputScreen({ onGoAnalysis, onAddReport }) {
  const [line, setLine] = useState("");
  const [category, setCategory] = useState("");
  const [detail, setDetail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!line || !category || !detail) {
      alert("すべて入力してください");
      return;
    }

    onAddReport({
      line,
      category,
      detail,
      date: new Date().toLocaleString(),
    });

    setLine("");
    setCategory("");
    setDetail("");
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    border: "1px solid #d0d7de",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontWeight: "600",
    fontSize: "14px",
    color: "#333",
  };

  const cardStyle = {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", color: "#1f2937" }}>
          エラー報告ツール
        </h1>
        <p style={{ marginTop: "8px", color: "#6b7280" }}>
          入力画面
        </p>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "20px", color: "#111827" }}>
          エラー報告を入力
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>ライン名</label>
            <input
              style={inputStyle}
              value={line}
              onChange={(e) => setLine(e.target.value)}
              placeholder="例: Aライン"
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>カテゴリ</label>
            <input
              style={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例: 設備異常"
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>詳細</label>
            <textarea
              style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="例: センサーが反応しない"
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              style={{
                padding: "12px 20px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              報告を追加
            </button>

            <button
              type="button"
              onClick={onGoAnalysis}
              style={{
                padding: "12px 20px",
                backgroundColor: "#111827",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              分析画面へ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}