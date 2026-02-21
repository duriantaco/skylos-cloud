export const FEATURE_KEYS = {
  DASHBOARD_ACCESS: 'dashboard_access',
  TEAM_COLLABORATION: 'team_collaboration',
  COMPLIANCE_REPORT: 'compliance_report',
  HISTORICAL_TRACKING: 'historical_tracking',
  SLACK_INTEGRATION: 'slack_integration',
  DISCORD_INTEGRATION: 'discord_integration',
  TREND_ANALYTICS: 'trend_analytics',
  SCAN_UPLOAD: 'scan_upload',
  PR_REVIEW: 'pr_review',
  MCP_ANALYZE: 'mcp_analyze',
  MCP_SECURITY_SCAN: 'mcp_security_scan',
  MCP_QUALITY_CHECK: 'mcp_quality_check',
  MCP_SECRETS_SCAN: 'mcp_secrets_scan',
  MCP_REMEDIATE: 'mcp_remediate',
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

export async function checkCredits(featureKey: FeatureKey): Promise<{
  hasCredits: boolean;
  balance: number;
  required: number;
  unlimited: boolean;
}> {
  try {
    const balanceRes = await fetch('/api/credits/balance');
    if (!balanceRes.ok) {
      throw new Error('Failed to fetch balance');
    }
    const balanceData = await balanceRes.json();

    if (balanceData.plan === 'enterprise') {
      return {
        hasCredits: true,
        balance: Infinity,
        required: 0,
        unlimited: true
      };
    }

    const costsRes = await fetch('/api/credits/costs');
    if (!costsRes.ok) {
      throw new Error('Failed to fetch costs');
    }
    const costsData = await costsRes.json();
    const featureCost = costsData.costs.find((c: any) => c.feature_key === featureKey);

    if (!featureCost) {
      throw new Error(`Feature ${featureKey} not found`);
    }

    return {
      hasCredits: balanceData.balance >= featureCost.cost_credits,
      balance: balanceData.balance,
      required: featureCost.cost_credits,
      unlimited: false
    };
  } catch (error) {
    console.error('Error checking credits:', error);
    return {
      hasCredits: false,
      balance: 0,
      required: 0,
      unlimited: false
    };
  }
}

export async function useFeature(
  featureKey: FeatureKey,
  metadata?: Record<string, any>
): Promise<{
  success: boolean;
  error?: string;
  balance_after?: number;
}> {
  try {
    const response = await fetch('/api/credits/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature_key: featureKey, metadata })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to deduct credits'
      };
    }

    return {
      success: true,
      balance_after: data.balance_after
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error'
    };
  }
}

export function getFeatureInfo(featureKey: FeatureKey): {
  name: string;
  description: string;
} {
  const info: Record<FeatureKey, { name: string; description: string }> = {
    dashboard_access: {
      name: 'Cloud Dashboard',
      description: 'Access the cloud dashboard with historical data and analytics'
    },
    team_collaboration: {
      name: 'Team Collaboration',
      description: 'Enable comments, assignments, and team features'
    },
    compliance_report: {
      name: 'Compliance Report',
      description: 'Generate compliance reports for PCI DSS, SOC2, HIPAA'
    },
    historical_tracking: {
      name: 'Historical Tracking',
      description: 'Track scan history and trends over time'
    },
    slack_integration: {
      name: 'Slack Integration',
      description: 'Send notifications to Slack'
    },
    discord_integration: {
      name: 'Discord Integration',
      description: 'Send notifications to Discord'
    },
    trend_analytics: {
      name: 'Trend Analytics',
      description: 'Advanced trend charts and analytics'
    },
    scan_upload: {
      name: 'Scan Upload',
      description: 'Upload scan results to the cloud'
    },
    pr_review: {
      name: 'PR Review',
      description: 'Post inline review comments on pull requests'
    },
    mcp_analyze: {
      name: 'MCP Analysis',
      description: 'Dead code analysis via MCP server'
    },
    mcp_security_scan: {
      name: 'MCP Security Scan',
      description: 'Security scan via MCP server'
    },
    mcp_quality_check: {
      name: 'MCP Quality Check',
      description: 'Quality check via MCP server'
    },
    mcp_secrets_scan: {
      name: 'MCP Secrets Scan',
      description: 'Secrets scan via MCP server'
    },
    mcp_remediate: {
      name: 'MCP Remediation',
      description: 'AI-powered code remediation via MCP server'
    }
  };

  return info[featureKey] || { name: featureKey, description: '' };
}
