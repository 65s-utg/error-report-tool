import dotenv from "dotenv";
import { WebClient } from "@slack/web-api";

dotenv.config();

const token = process.env.SLACK_BOT_TOKEN;
const channel = process.env.SLACK_CHANNEL_ID;

if (!token) throw new Error("SLACK_BOT_TOKEN がありません");
if (!channel) throw new Error("SLACK_CHANNEL_ID がありません");

const client = new WebClient(token);

async function main() {
  const res = await client.chat.postMessage({
    channel,
    text: "Slack投稿テスト成功",
  });

  console.log("投稿できた", {
    ok: res.ok,
    channel: res.channel,
    ts: res.ts,
  });
}

main().catch((e) => {
  console.error(e.data || e);
});