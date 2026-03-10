-- Create audit_logs table to store complete request information
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request info
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    query JSONB DEFAULT '{}',
    body JSONB DEFAULT '{}',
    headers JSONB DEFAULT '{}',
    
    -- User info (if authenticated)
    user_id UUID,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Response info
    status_code INT,
    response_time_ms INT,
    response_body JSONB DEFAULT '{}',
    
    -- Client info
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Error info (if any)
    error_message TEXT,
    error_stack TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_path ON public.audit_logs(path);
CREATE INDEX idx_audit_logs_method ON public.audit_logs(method);
CREATE INDEX idx_audit_logs_status_code ON public.audit_logs(status_code);

-- Add comment
COMMENT ON TABLE public.audit_logs IS 'Stores complete request/response audit information for all API calls';
