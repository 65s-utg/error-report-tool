import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { WebClient } from "@slack/web-api";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// テスト用：全部同じチャンネル
const CHANNEL = process.env.SLACK_CHANNEL_ID;

app.post("/api/slack", async (req, res) => {
  try {
    const report = req.body;

    const troubleLabel =
    report.type === "occurred"
      ? `${report.subCategory}停止`
      : `${report.subCategory}復旧`;
  
      const title =
      report.type === "occurred"
        ? `【発生】${report.line} ${report.category} / ${report.subCategory} / 停止`
        : `【復旧】${report.line} ${report.category} / ${report.subCategory} / 復旧`;

        await slack.chat.postMessage({
          channel: CHANNEL,
          text: title,
        });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

app.listen(3001, () => {
  console.log("Slack server running on 3001");
});