export type DiscordNotifyConfig = {
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

const COLORS = {
  RED: 15548997,     // #ED4245 - Failure
  GREEN: 5763719,    // #57F287 - Success
  YELLOW: 16776960,  // #FFFF00 - Warning
  BLUE: 5793266,     // #5865F2 - Info
};

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 3) + '...' : str;
}

function buildDiscordEmbed(config: DiscordNotifyConfig, result: GateResult) {
  const { projectName, branch, commitHash, repoUrl, scanId, siteUrl } = config;
  const { passed, isRecovery, newIssues, criticalCount, highCount, mediumCount, lowCount, suppressedCount } = result;

  const shortSha = commitHash?.slice(0, 7) || 'local';
  const scanUrl = `${siteUrl}/dashboard/scans/${scanId}`;
  const commitUrl = repoUrl && commitHash !== 'local'
    ? `${repoUrl.replace(/\.git$/, '')}/commit/${commitHash}`
    : null;

  let title: string;
  let color: number;

  if (passed && isRecovery) {
    title = '✅ Quality Gate Recovered';
    color = COLORS.GREEN;
  } else if (passed) {
    title = '✅ Quality Gate Passed';
    color = COLORS.GREEN;
  } else {
    title = '🚨 Quality Gate Failed';
    color = COLORS.RED;
  }

  const descParts: string[] = [];
  
  const commitLink = commitUrl ? `[\`${shortSha}\`](${commitUrl})` : `\`${shortSha}\``;
  descParts.push(`**${truncate(projectName, 30)}** • \`${truncate(branch, 30)}\` • ${commitLink}`);

  if (!passed || newIssues > 0) {
    descParts.push('');
    descParts.push(`**New Issues Found: ${newIssues}**`);
    
    const severityParts: string[] = [];
    if (criticalCount > 0) severityParts.push(`🔴 ${criticalCount} Critical`);
    if (highCount > 0) severityParts.push(`🟠 ${highCount} High`);
    if (mediumCount > 0) severityParts.push(`🟡 ${mediumCount} Medium`);
    if (lowCount > 0) severityParts.push(`🔵 ${lowCount} Low`);
    
    if (severityParts.length > 0) {
      descParts.push(severityParts.join('  •  '));
    }

    if (suppressedCount > 0) {
      descParts.push(`_${suppressedCount} issue${suppressedCount !== 1 ? 's' : ''} suppressed_`);
    }
  } else {
    descParts.push('');
    descParts.push('🎉 No new issues detected. Great job!');
  }

  return {
    embeds: [
      {
        title,
        description: descParts.join('\n'),
        color,
        url: scanUrl,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Skylos',
        },
      },
    ],
  };
}

export async function sendDiscordNotification(
  config: DiscordNotifyConfig,
  result: GateResult
): Promise<{ success: boolean; error?: string }> {
  const { webhookUrl } = config;

  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL configured' };
  }

  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && 
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
    return { success: false, error: 'Invalid Discord webhook URL' };
  }

  const payload = buildDiscordEmbed(config, result);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Discord webhook error:', response.status, text);
      return { success: false, error: `Discord API error: ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Discord notification failed:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}

export async function testDiscordWebhook(
  webhookUrl: string,
  projectName: string
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL provided' };
  }

  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
    return { success: false, error: 'Invalid Discord webhook URL. Must be a Discord webhook URL.' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: '🐕 Skylos Connected!',
            description: `Webhook configured successfully for **${projectName}**.\n\nYou'll receive notifications when quality gates fail.`,
            color: COLORS.GREEN,
            footer: {
              text: 'This is a test message from Skylos',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      if (text.includes('Unknown Webhook')) {
        return { success: false, error: 'Invalid webhook URL or webhook deleted' };
      }
      return { success: false, error: `Discord error: ${text}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to connect to Discord' };
  }
}