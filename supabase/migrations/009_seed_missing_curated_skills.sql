-- ==========================================
-- SEEDER: Insert 3 missing curated skills from anthropics/skills
-- ==========================================

INSERT INTO public.skills (id, name, slug, description, long_description, category, tags, source, repo_url, stars, verified, is_active, risk_level, install_command, run_command) VALUES
('anthropic_skill_docx', 'Document Editor (DOCX)', 'document-editor-docx', 'Criação e edição de documentos Word com Claude. Gera relatórios formatados, edita templates e extrai campos de formulários.', 'Document creation and editing skill for Word files (.docx) that powers Claude''s document capabilities. Supports generating formatted reports, editing templates, and extracting form fields. Integrates with Claude''s native document processing pipeline.', 'content', ARRAY['documents', 'word', 'docx', 'office', 'claude'], 'github', 'https://github.com/anthropics/skills', 0, false, true, 'low', 'npx aifeast document-editor-docx', 'npx aifeast run document-editor-docx'),
('anthropic_skill_xlsx', 'Spreadsheet Analyzer (XLSX)', 'spreadsheet-analyzer-xlsx', 'Análise e criação de planilhas Excel. Lê dados, gera gráficos e formata tabelas automaticamente.', 'Document creation and editing skill for Excel files (.xlsx). Supports reading spreadsheet data, generating charts, formatting tables, and creating new workbooks with calculated data. Integrates with Claude''s document processing.', 'analysis', ARRAY['excel', 'xlsx', 'spreadsheets', 'data', 'claude'], 'github', 'https://github.com/anthropics/skills', 0, false, true, 'low', 'npx aifeast spreadsheet-analyzer-xlsx', 'npx aifeast run spreadsheet-analyzer-xlsx'),
('anthropic_skill_pptx', 'Presentation Generator (PPTX)', 'presentation-generator-pptx', 'Cria apresentações PowerPoint a partir de texto. Gera slides com títulos, bullets e layouts profissionais.', 'Document creation and editing skill for PowerPoint files (.pptx). Creates presentations from text descriptions, generates slides with titles, bullet points, and professional layouts. Supports template-based generation.', 'content', ARRAY['powerpoint', 'pptx', 'presentations', 'claude'], 'github', 'https://github.com/anthropics/skills', 0, false, true, 'low', 'npx aifeast presentation-generator-pptx', 'npx aifeast run presentation-generator-pptx')

ON CONFLICT (id) DO NOTHING;

-- Verification
SELECT
  source,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE verified = true) as verified
FROM public.skills
GROUP BY source
ORDER BY source;
