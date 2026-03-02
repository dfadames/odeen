-- Schema Migration Draft

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Global census of participants
CREATE TABLE voter_registry (
    hashed_email VARCHAR(255) PRIMARY KEY,
    is_present BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Sequential motions (polls)
CREATE TABLE motions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions JSONB DEFAULT '[]'::jsonb,
    requires_totp BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, LIVE, COMPLETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Optional: Allowlist of voters per motion
CREATE TABLE allowed_voters (
    motion_id UUID NOT NULL REFERENCES motions(id) ON DELETE CASCADE,
    hashed_email VARCHAR(255) NOT NULL,
    PRIMARY KEY (motion_id, hashed_email)
);

-- 3. Anonymous Votes Ledger (WHAT was voted)
-- CRITICAL restriction: No link to who voted.
CREATE TABLE anonymous_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motion_id UUID NOT NULL REFERENCES motions(id) ON DELETE CASCADE,
    vote_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Voter Receipts Ledger (WHO voted)
-- Tracks that a specific hashed_email voted in a specific motion to prevent double voting.
CREATE TABLE voter_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motion_id UUID NOT NULL REFERENCES motions(id) ON DELETE CASCADE,
    hashed_email VARCHAR(255) NOT NULL REFERENCES voter_registry(hashed_email) ON DELETE CASCADE,
    receipt_hash VARCHAR(255) UNIQUE NOT NULL, -- Tx-Hash returned to the voter
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(motion_id, hashed_email)
);
