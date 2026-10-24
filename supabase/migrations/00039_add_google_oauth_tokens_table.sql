-- Create table to store Google OAuth tokens securely
CREATE TABLE google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create table to track backup history
CREATE TABLE backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'auto', 'scheduled')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  spreadsheet_id TEXT,
  sheet_name TEXT,
  error_message TEXT,
  backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE google_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

-- Policies for google_oauth_tokens
CREATE POLICY "Users can view their own tokens"
  ON google_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON google_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON google_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON google_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for backup_history
CREATE POLICY "Users can view their own backup history"
  ON backup_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup history"
  ON backup_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all backup history
CREATE POLICY "Admins can view all backup history"
  ON backup_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_google_oauth_tokens_user_id ON google_oauth_tokens(user_id);
CREATE INDEX idx_backup_history_user_id ON backup_history(user_id);
CREATE INDEX idx_backup_history_quotation_id ON backup_history(quotation_id);
CREATE INDEX idx_backup_history_status ON backup_history(status);

-- Add comments
COMMENT ON TABLE google_oauth_tokens IS 'Stores encrypted Google OAuth tokens for Google Sheets API access';
COMMENT ON TABLE backup_history IS 'Tracks all backup operations to Google Sheets';
COMMENT ON COLUMN google_oauth_tokens.refresh_token IS 'Long-lived refresh token - must be encrypted at rest';
COMMENT ON COLUMN google_oauth_tokens.token_expiry IS 'Access token expiration timestamp';