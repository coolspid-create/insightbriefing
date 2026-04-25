-- Table Definition: trend_reports
CREATE TABLE public.trend_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
    sector_id VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    one_line_summary TEXT NOT NULL,
    key_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    trend_analysis TEXT,
    impact_analysis TEXT,
    future_outlook TEXT,
    diagram_type VARCHAR(100),
    diagram_prompt TEXT,
    diagram_image_url TEXT,
    source_article_ids JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.trend_reports ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Public read access for trend_reports" ON public.trend_reports
    FOR SELECT
    USING (true);

-- Create policy for admin write access (Assuming similar to existing news tables)
CREATE POLICY "Enable insert for authenticated users only" ON public.trend_reports
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON public.trend_reports
    FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON public.trend_reports
    FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX idx_trend_reports_sector_type ON public.trend_reports(sector_id, report_type);
CREATE INDEX idx_trend_reports_period_end ON public.trend_reports(period_end);
