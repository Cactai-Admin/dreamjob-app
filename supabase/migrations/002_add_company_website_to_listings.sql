-- Add company_website_url directly to job_listings so it persists
-- even when the company join (company_id) is null or the company record is missing.
ALTER TABLE job_listings ADD COLUMN IF NOT EXISTS company_website_url TEXT;
