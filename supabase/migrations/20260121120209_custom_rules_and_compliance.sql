CREATE TABLE custom_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    rule_id TEXT NOT NULL,                    -- "ACME-001"
    name TEXT NOT NULL,                       -- "Require @internal_auth on endpoints"
    description TEXT,
    
    -- Rule config
    severity TEXT NOT NULL DEFAULT 'MEDIUM',  -- CRITICAL, HIGH, MEDIUM, LOW
    category TEXT NOT NULL DEFAULT 'custom',  -- security, architecture, style, custom
    rule_type TEXT NOT NULL DEFAULT 'yaml',   -- 'yaml' or 'python'
    
    -- Rule def
    yaml_config JSONB,                        -- For YAML-based rules
    python_code TEXT,                         -- For Python plugin rules (Team+ only)
    
    enabled BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(org_id, rule_id)
);

CREATE INDEX idx_custom_rules_org_enabled ON custom_rules(org_id, enabled);

ALTER TABLE custom_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's rules"
    ON custom_rules FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert rules for their org"
    ON custom_rules FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their org's rules"
    ON custom_rules FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their org's rules"
    ON custom_rules FOR DELETE
    USING (org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ));


-- Frameworks (PCI DSS, SOC2, etc.)
CREATE TABLE compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,                -- "PCI_DSS_4", "SOC2"
    name TEXT NOT NULL,                       -- "PCI DSS 4.0"
    version TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO compliance_frameworks (code, name, version, description) VALUES
('PCI_DSS_4', 'PCI DSS', '4.0', 'Payment Card Industry Data Security Standard'),
('SOC2', 'SOC 2', 'Type II', 'Service Organization Control 2'),
('HIPAA', 'HIPAA', '2023', 'Health Insurance Portability and Accountability Act'),
('OWASP_TOP10', 'OWASP Top 10', '2021', 'Open Web Application Security Project Top 10'),
('GDPR', 'GDPR', '2018', 'General Data Protection Regulation'),
('ISO_27001', 'ISO 27001', '2022', 'Information Security Management'),
('NIST_CSF', 'NIST CSF', '2.0', 'Cybersecurity Framework');

CREATE TABLE org_compliance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework_id UUID NOT NULL REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    next_audit_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, framework_id)
);

ALTER TABLE org_compliance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's compliance settings"
    ON org_compliance_settings FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their org's compliance settings"
    ON org_compliance_settings FOR ALL
    USING (org_id IN (
        SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    ));

ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view frameworks"
    ON compliance_frameworks FOR SELECT
    USING (true);