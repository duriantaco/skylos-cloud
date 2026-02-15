/**
 * Compliance Framework Mappings
 *
 * Maps Skylos rule IDs to compliance framework requirements.
 * Each rule can map to multiple frameworks and requirements.
 */

export type ComplianceMapping = {
  ruleId: string;
  ruleName: string;
  category: string;
  frameworks: {
    [frameworkCode: string]: {
      requirements: string[];
      description: string;
    };
  };
};

export const COMPLIANCE_MAPPINGS: ComplianceMapping[] = [
  // SQL Injection
  {
    ruleId: 'SKY-D211',
    ruleName: 'SQL Injection',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A03:2021 - Injection'],
        description: 'Injection flaws, such as SQL, NoSQL, OS, and LDAP injection'
      },
      PCI_DSS_4: {
        requirements: ['6.5.1 - Injection flaws, particularly SQL injection'],
        description: 'Prevent injection flaws in application code'
      },
      SOC2: {
        requirements: ['CC6.1 - Logical and physical access controls'],
        description: 'Restrict logical access through secure coding practices'
      }
    }
  },

  // Command Injection
  {
    ruleId: 'SKY-D212',
    ruleName: 'Command Injection',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A03:2021 - Injection'],
        description: 'OS command injection vulnerabilities'
      },
      PCI_DSS_4: {
        requirements: ['6.5.1 - Injection flaws'],
        description: 'Prevent command injection attacks'
      }
    }
  },

  // XSS
  {
    ruleId: 'SKY-D226',
    ruleName: 'XSS via mark_safe',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A03:2021 - Injection'],
        description: 'Cross-Site Scripting (XSS) vulnerabilities'
      },
      PCI_DSS_4: {
        requirements: ['6.5.7 - Cross-site scripting (XSS)'],
        description: 'Prevent XSS vulnerabilities in web applications'
      }
    }
  },

  // Path Traversal
  {
    ruleId: 'SKY-D215',
    ruleName: 'Path Traversal',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A01:2021 - Broken Access Control'],
        description: 'Path traversal and file inclusion vulnerabilities'
      },
      PCI_DSS_4: {
        requirements: ['6.5.8 - Improper access control'],
        description: 'Restrict file system access'
      }
    }
  },

  // SSRF
  {
    ruleId: 'SKY-D216',
    ruleName: 'Server-Side Request Forgery (SSRF)',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A10:2021 - Server-Side Request Forgery (SSRF)'],
        description: 'SSRF flaws that allow attackers to access internal resources'
      },
      PCI_DSS_4: {
        requirements: ['6.5.10 - Broken authentication and session management'],
        description: 'Validate and sanitize all URLs and requests'
      }
    }
  },

  // Weak Cryptography
  {
    ruleId: 'SKY-D207',
    ruleName: 'Weak Hash Algorithm (MD5)',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A02:2021 - Cryptographic Failures'],
        description: 'Use of weak or broken cryptographic algorithms'
      },
      PCI_DSS_4: {
        requirements: ['3.5.1 - Strong cryptography and security protocols'],
        description: 'Use strong, industry-accepted encryption algorithms'
      },
      SOC2: {
        requirements: ['CC6.7 - Encryption of data in transit and at rest'],
        description: 'Use approved cryptographic algorithms'
      }
    }
  },

  {
    ruleId: 'SKY-D208',
    ruleName: 'Weak Hash Algorithm (SHA1)',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A02:2021 - Cryptographic Failures'],
        description: 'Use of weak or broken cryptographic algorithms'
      },
      PCI_DSS_4: {
        requirements: ['3.5.1 - Strong cryptography and security protocols'],
        description: 'Use strong cryptographic algorithms (SHA-256 or better)'
      }
    }
  },

  // TLS/SSL
  {
    ruleId: 'SKY-D210',
    ruleName: 'TLS Verification Disabled',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A07:2021 - Identification and Authentication Failures'],
        description: 'Insecure SSL/TLS configuration'
      },
      PCI_DSS_4: {
        requirements: ['4.1 - Strong cryptography during transmission'],
        description: 'Encrypt transmission of cardholder data with strong cryptography'
      },
      HIPAA: {
        requirements: ['164.312(e)(1) - Transmission Security'],
        description: 'Implement technical security measures for electronic transmission'
      }
    }
  },

  // Hardcoded Secrets
  {
    ruleId: 'HARDCODED_PASSWORD',
    ruleName: 'Hardcoded Password',
    category: 'SECRET',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A07:2021 - Identification and Authentication Failures'],
        description: 'Hardcoded credentials in source code'
      },
      PCI_DSS_4: {
        requirements: ['8.3.2 - Strong authentication for users', '8.6 - Secure authentication credentials'],
        description: 'Never hardcode authentication credentials'
      },
      SOC2: {
        requirements: ['CC6.1 - Logical access controls'],
        description: 'Secure storage and management of credentials'
      },
      HIPAA: {
        requirements: ['164.312(a)(2)(i) - Unique User Identification'],
        description: 'Assign unique identifier to authorized users'
      }
    }
  },

  // API Keys
  {
    ruleId: 'API_KEY',
    ruleName: 'Exposed API Key',
    category: 'SECRET',
    frameworks: {
      PCI_DSS_4: {
        requirements: ['8.6 - Secure authentication credentials'],
        description: 'Do not expose API keys or tokens in source code'
      },
      SOC2: {
        requirements: ['CC6.1 - Logical access controls'],
        description: 'Protect API keys and authentication tokens'
      }
    }
  },

  // Deserialization
  {
    ruleId: 'SKY-D204',
    ruleName: 'Unsafe Pickle Deserialization',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A08:2021 - Software and Data Integrity Failures'],
        description: 'Insecure deserialization leading to remote code execution'
      },
      PCI_DSS_4: {
        requirements: ['6.5.1 - Injection flaws'],
        description: 'Validate and sanitize all deserialization inputs'
      }
    }
  },

  // Open Redirect
  {
    ruleId: 'SKY-D230',
    ruleName: 'Open Redirect',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A01:2021 - Broken Access Control'],
        description: 'Unvalidated redirects and forwards'
      },
      PCI_DSS_4: {
        requirements: ['6.5.1 - Injection flaws'],
        description: 'Validate all redirect destinations'
      }
    }
  },

  // CORS
  {
    ruleId: 'SKY-D231',
    ruleName: 'CORS Misconfiguration',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A05:2021 - Security Misconfiguration'],
        description: 'Insecure CORS policy allowing unauthorized access'
      },
      PCI_DSS_4: {
        requirements: ['6.5.10 - Broken authentication and session management'],
        description: 'Properly configure CORS policies'
      }
    }
  },

  // JWT
  {
    ruleId: 'SKY-D232',
    ruleName: 'JWT Security Issue',
    category: 'SECURITY',
    frameworks: {
      OWASP_TOP10: {
        requirements: ['A07:2021 - Identification and Authentication Failures'],
        description: 'Weak JWT implementation or validation'
      },
      PCI_DSS_4: {
        requirements: ['8.3 - Strong authentication'],
        description: 'Implement secure JWT handling'
      }
    }
  },

  // Code Quality
  {
    ruleId: 'SKY-Q301',
    ruleName: 'High Cyclomatic Complexity',
    category: 'QUALITY',
    frameworks: {
      SOC2: {
        requirements: ['CC8.1 - Change management procedures'],
        description: 'Maintain code quality for reliable systems'
      },
      ISO_27001: {
        requirements: ['A.12.1.4 - Separation of development, testing and operational environments'],
        description: 'Code quality controls'
      }
    }
  },

  // Logging
  {
    ruleId: 'MISSING_ERROR_HANDLING',
    ruleName: 'Missing Error Handling',
    category: 'QUALITY',
    frameworks: {
      SOC2: {
        requirements: ['CC7.3 - System monitoring'],
        description: 'Proper error handling and logging'
      },
      PCI_DSS_4: {
        requirements: ['10.2 - Audit trail for all system components'],
        description: 'Log and monitor all access to system components'
      }
    }
  }
];

/**
 * Get all rule IDs for a specific framework
 */
export function getRulesForFramework(frameworkCode: string): string[] {
  return COMPLIANCE_MAPPINGS
    .filter(mapping => mapping.frameworks[frameworkCode])
    .map(mapping => mapping.ruleId);
}

/**
 * Get all frameworks that a rule maps to
 */
export function getFrameworksForRule(ruleId: string): string[] {
  const mapping = COMPLIANCE_MAPPINGS.find(m => m.ruleId === ruleId);
  return mapping ? Object.keys(mapping.frameworks) : [];
}

/**
 * Get detailed compliance info for a rule
 */
export function getComplianceInfo(ruleId: string, frameworkCode: string) {
  const mapping = COMPLIANCE_MAPPINGS.find(m => m.ruleId === ruleId);
  return mapping?.frameworks[frameworkCode] || null;
}

/**
 * Get all requirements for a framework
 */
export function getAllRequirementsForFramework(frameworkCode: string): string[] {
  const requirements = new Set<string>();

  COMPLIANCE_MAPPINGS.forEach(mapping => {
    const framework = mapping.frameworks[frameworkCode];
    if (framework) {
      framework.requirements.forEach(req => requirements.add(req));
    }
  });

  return Array.from(requirements).sort();
}
