export async function notifyNewRequirement(req: {
  reqId: string;
  clientGroup: string;
  jobRole: string;
  priority: string;
  id: string;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const priorityEmoji =
    req.priority === "high" ? "🔴" : req.priority === "medium" ? "🟡" : "🟢";

  const payload = {
    text: `${priorityEmoji} *New Requirement: ${req.reqId}*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${priorityEmoji} *New Requirement — <${appUrl}/requirements/${req.id}|${req.reqId}>*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Client:*\n${req.clientGroup}` },
          { type: "mrkdwn", text: `*Role:*\n${req.jobRole}` },
          {
            type: "mrkdwn",
            text: `*Priority:*\n${req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View Requirement" },
            url: `${appUrl}/requirements/${req.id}`,
          },
        ],
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // fire-and-forget; log but don't break the request
    console.error("Slack notification failed");
  }
}
