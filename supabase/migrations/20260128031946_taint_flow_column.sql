ALTER TABLE findings 
ADD COLUMN IF NOT EXISTS taint_flow JSONB DEFAULT NULL;

COMMENT ON COLUMN findings.taint_flow IS 'Taint flow data from Skylos CLI analysis. Schema: { source: FlowNode, transforms: FlowNode[], sink: FlowNode, attack_example?: { payload, result }, fix_suggestion?: { title, code, explanation }, confidence: string }';

CREATE INDEX IF NOT EXISTS idx_findings_has_flow 
ON findings ((taint_flow IS NOT NULL)) 
WHERE taint_flow IS NOT NULL;
