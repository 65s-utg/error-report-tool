export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }
  
    try {
      const { text } = req.body || {};
  
      if (!text || !String(text).trim()) {
        return res.status(400).json({ ok: false, error: 'text is required' });
      }
  
      const token = process.env.SLACK_BOT_TOKEN;
      const channel = process.env.SLACK_CHANNEL_ID;
  
      if (!token || !channel) {
        return res.status(500).json({
          ok: false,
          error: 'Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID',
        });
      }
  
      const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel,
          text: String(text).trim(), // 1行投稿フォーマット
        }),
      });
  
      const slackData = await slackRes.json();
  
      if (!slackData.ok) {
        return res.status(500).json({
          ok: false,
          error: slackData.error || 'Slack API error',
          slack: slackData,
        });
      }
  
      return res.status(200).json({
        ok: true,
        ts: slackData.ts,
        channel: slackData.channel,
      });
    } catch (error) {
      console.error('slack-post error:', error);
      return res.status(500).json({
        ok: false,
        error: error.message || 'Internal Server Error',
      });
    }
  }