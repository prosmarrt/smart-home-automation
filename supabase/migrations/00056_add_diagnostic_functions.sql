-- Create helper functions for database health checks

-- Function to get table columns
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::text,
    data_type::text,
    is_nullable::text,
    column_default::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND information_schema.columns.table_name = get_table_columns.table_name
  ORDER BY ordinal_position;
$$;

-- Function to get table policies
CREATE OR REPLACE FUNCTION get_table_policies(table_name text)
RETURNS TABLE (
  policyname text,
  cmd text,
  roles text[],
  qual text,
  with_check text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    policyname::text,
    cmd::text,
    roles::text[],
    qual::text,
    with_check::text
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = get_table_policies.table_name;
$$;

-- Function to get table indexes
CREATE OR REPLACE FUNCTION get_table_indexes(table_name text)
RETURNS TABLE (
  indexname text,
  indexdef text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    indexname::text,
    indexdef::text
  FROM pg_indexes
  WHERE schemaname = 'public' AND pg_indexes.tablename = get_table_indexes.table_name;
$$;

COMMENT ON FUNCTION get_table_columns(text) IS 'Returns column information for a given table';
COMMENT ON FUNCTION get_table_policies(text) IS 'Returns RLS policies for a given table';
COMMENT ON FUNCTION get_table_indexes(text) IS 'Returns indexes for a given table';
