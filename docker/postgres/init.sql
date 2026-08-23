-- ==============================================================================
-- POSTGRESQL INITIALIZATION SCRIPT - DISTRIBUTED JOB SCHEDULER
-- ==============================================================================

-- Enable UUID extension for high-performance random UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_stat_statements for query observability and performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Set timezone to UTC for absolute consistency
SET TIME ZONE 'UTC';

-- Advisory log
DO $$
BEGIN
  RAISE NOTICE 'Database initialized with UUID, pgcrypto, and UTC timezone.';
END
$$;
