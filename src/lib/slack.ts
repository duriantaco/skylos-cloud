export type SlackNotifyConfig = {
  webhookUrl: string;
  projectName: string;
  branch: string;
  commitHash: string;
  repoUrl?: string | null;
  scanId: string;
  siteUrl: string;
};

export type GateResult = {
  passed: boolean;
  isRecovery?: boolean;
  newIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  suppressedCount: number;
};

type SlackBlock = {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: any[];
  accessory?: any;
  fields?: any[];
};

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

function buildSlackBlocks(config: SlackNotifyConfig, result: GateResult): SlackBlock[] {
  const { projectName, branch, commitHash, repoUrl, scanId, siteUrl } = config;
  const { passed, isRecovery, newIssues, criticalCount, highCount, mediumCount, lowCount, suppressedCount } = result;

  const shortSha = commitHash?.slice(0, 7) || 'local';
  const scanUrl = `${siteUrl}/dashboard/scans/${scanId}`;
  const commitUrl = repoUrl && commitHash !== 'local' 
    ? `${repoUrl.replace(/\.git$/, '')}/commit/${commitHash}`
    : null;

  const blocks: SlackBlock[] = [];

  if (passed && isRecovery) {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: '✅ Quality Gate Recovered',
        emoji: true,
      },
    });
  } else if (passed) {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: '✅ Quality Gate Passed',
        emoji: true,
      },
    });
  } else {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 Quality Gate Failed',
        emoji: true,
      },
    });
  }

  const contextParts = [
    `*${truncate(projectName, 30)}*`,
    `\`${truncate(branch, 30)}\``,
    commitUrl ? `<${commitUrl}|\`${shortSha}\`>` : `\`${shortSha}\``,
  ];

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: contextParts.join('  •  '),
      },
    ],
  });

  blocks.push({ type: 'divider' });

  if (!passed || newIssues > 0) {
    const issueLines: string[] = [];

    if (criticalCount > 0) {
      issueLines.push(`🔴 *${criticalCount}* Critical`);
    }
    if (highCount > 0) {
      issueLines.push(`🟠 *${highCount}* High`);
    }
    if (mediumCount > 0) {
      issueLines.push(`🟡 *${mediumCount}* Medium`);
    }
    if (lowCount > 0) {
      issueLines.push(`🔵 *${lowCount}* Low`);
    }

    if (issueLines.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*New Issues Found: ${newIssues}*\n${issueLines.join('  •  ')}`,
        },
      });
    }

    if (suppressedCount > 0) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_${suppressedCount} issue${suppressedCount !== 1 ? 's' : ''} suppressed_`,
          },
        ],
      });
    }
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🎉 No new issues detected. Great job!',
      },
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '📊 View Full Report',
          emoji: true,
        },
        url: scanUrl,
        style: passed ? undefined : 'danger',
      },
    ],
  });

  return blocks;
}

export async function sendSlackNotification(
  config: SlackNotifyConfig,
  result: GateResult
): Promise<{ success: boolean; error?: string }> {
  const { webhookUrl } = config;

  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL configured' };
  }

  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    return { success: false, error: 'Invalid Slack webhook URL' };
  }

  const blocks = buildSlackBlocks(config, result);

  const fallbackText = result.passed
    ? `✅ Quality gate passed for ${config.projectName} (${config.branch})`
    : `🚨 Quality gate failed for ${config.projectName} (${config.branch}) - ${result.newIssues} new issues`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: fallbackText,
        blocks,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Slack webhook error:', response.status, text);
      return { success: false, error: `Slack API error: ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Slack notification failed:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}


export async function testSlackWebhook(
  webhookUrl: string,
  projectName: string
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL provided' };
  }

  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    return { success: false, error: 'Invalid Slack webhook URL. Must start with https://hooks.slack.com/' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `✅ Skylos webhook test successful!`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🐕 Skylos Connected!',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Webhook configured successfully for *${projectName}*.\n\nYou'll receive notifications when quality gates fail.`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '_This is a test message from Skylos_',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      if (text.includes('invalid_token') || text.includes('channel_not_found')) {
        return { success: false, error: 'Invalid webhook URL or channel not found' };
      }
      return { success: false, error: `Slack error: ${text}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to connect to Slack' };
  }
}