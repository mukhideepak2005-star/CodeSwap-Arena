-- CodeSwap Arena Complete PostgreSQL Schema
-- Fully normalized with UUIDs, indexes, constraints, and audit trails

CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizers (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    organization VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    banner_url TEXT,
    visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('public', 'private')),
    pin_hash VARCHAR(255),
    allowed_languages TEXT[] DEFAULT '{"c","cpp","java","python","javascript"}',
    max_participants INT DEFAULT 100,
    reg_start TIMESTAMP WITH TIME ZONE,
    reg_end TIMESTAMP WITH TIME ZONE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_rounds INT DEFAULT 1,
    rules TEXT,
    scoring_config JSONB DEFAULT '{"test_cases": 60, "organizer_review": 20, "explanation": 20}',
    status VARCHAR(30) DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'live', 'completed', 'archived')),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizer_members (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '{"view_contest": true, "manage_participants": false, "manage_code_blocks": false, "manage_rounds": false, "configure_assignments": false, "configure_swaps": false, "view_submissions": true, "evaluate_submissions": false, "manage_leaderboard": false, "publish_results": false}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, invited_email)
);

CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    participant_code VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    access_code_hash VARCHAR(255) NOT NULL,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'disqualified')),
    is_registered BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, participant_code)
);

CREATE TABLE IF NOT EXISTS code_blocks (
    id UUID PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    language VARCHAR(50) NOT NULL CHECK (language IN ('c', 'cpp', 'java', 'python', 'javascript')),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    original_code TEXT NOT NULL,
    input_format TEXT,
    expected_output TEXT,
    time_limit_ms INT DEFAULT 2000,
    memory_limit_kb INT DEFAULT 128000,
    marks INT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY,
    code_block_id UUID NOT NULL REFERENCES code_blocks(id) ON DELETE CASCADE,
    is_hidden BOOLEAN DEFAULT FALSE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    marks INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rounds (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    round_name VARCHAR(255) NOT NULL,
    description TEXT,
    bug_intro_duration_minutes INT DEFAULT 20,
    debug_duration_minutes INT DEFAULT 30,
    scoring_config JSONB DEFAULT '{"test_cases": 60, "organizer_review": 20, "explanation": 20}',
    status VARCHAR(30) DEFAULT 'preparation' CHECK (status IN ('preparation', 'bug_introduction', 'submission_locked', 'swap_configuration', 'debugging', 'evaluation', 'results', 'completed')),
    bug_intro_start_time TIMESTAMP WITH TIME ZONE,
    debug_start_time TIMESTAMP WITH TIME ZONE,
    timer_paused_at TIMESTAMP WITH TIME ZONE,
    time_remaining_seconds INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, round_number)
);

CREATE TABLE IF NOT EXISTS code_assignments (
    id UUID PRIMARY KEY,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    code_block_id UUID NOT NULL REFERENCES code_blocks(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_locked BOOLEAN DEFAULT FALSE,
    UNIQUE(round_id, participant_id)
);

CREATE TABLE IF NOT EXISTS modification_submissions (
    id UUID PRIMARY KEY,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    code_block_id UUID NOT NULL REFERENCES code_blocks(id) ON DELETE RESTRICT,
    modified_code TEXT NOT NULL,
    submission_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'submitted',
    UNIQUE(round_id, participant_id)
);

CREATE TABLE IF NOT EXISTS swap_assignments (
    id UUID PRIMARY KEY,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    modification_submission_id UUID NOT NULL REFERENCES modification_submissions(id) ON DELETE RESTRICT,
    sender_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    recipient_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, sender_participant_id),
    UNIQUE(round_id, recipient_participant_id)
);

CREATE TABLE IF NOT EXISTS debug_submissions (
    id UUID PRIMARY KEY,
    swap_assignment_id UUID NOT NULL REFERENCES swap_assignments(id) ON DELETE RESTRICT,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    recipient_participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    corrected_code TEXT NOT NULL,
    bug_explanation TEXT,
    submission_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, recipient_participant_id)
);

CREATE TABLE IF NOT EXISTS execution_runs (
    id UUID PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    user_id UUID,
    user_role VARCHAR(20),
    code_block_id UUID REFERENCES code_blocks(id) ON DELETE SET NULL,
    language VARCHAR(50) NOT NULL,
    source_code TEXT NOT NULL,
    stdin TEXT,
    stdout TEXT,
    stderr TEXT,
    compile_output TEXT,
    status VARCHAR(50),
    execution_time_ms INT,
    memory_kb INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY,
    debug_submission_id UUID NOT NULL REFERENCES debug_submissions(id) ON DELETE RESTRICT,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE RESTRICT,
    automated_score DECIMAL(5,2) DEFAULT 0.00,
    organizer_score DECIMAL(5,2) DEFAULT 0.00,
    explanation_score DECIMAL(5,2) DEFAULT 0.00,
    total_score DECIMAL(5,2) DEFAULT 0.00,
    test_cases_passed INT DEFAULT 0,
    total_test_cases INT DEFAULT 0,
    organizer_comments TEXT,
    score_adjustment_reason TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'flagged')),
    reviewed_by UUID REFERENCES organizers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, participant_id)
);

CREATE TABLE IF NOT EXISTS evaluation_details (
    id UUID PRIMARY KEY,
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    is_passed BOOLEAN NOT NULL,
    actual_output TEXT,
    execution_time_ms INT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    actor_id UUID,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS abuse_reports (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    reported_by UUID,
    reporter_role VARCHAR(50),
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_visibility_status ON events(visibility, status);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_code_blocks_event ON code_blocks(event_id);
CREATE INDEX IF NOT EXISTS idx_rounds_event ON rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_round ON code_assignments(round_id);
CREATE INDEX IF NOT EXISTS idx_mod_submissions_round ON modification_submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_swap_assignments_round ON swap_assignments(round_id);
CREATE INDEX IF NOT EXISTS idx_debug_submissions_round ON debug_submissions(round_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_event_round ON evaluations(event_id, round_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_logs(event_id);
