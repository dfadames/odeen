-- name: GetLiveMotion :one
SELECT * FROM motions WHERE status = 'LIVE' LIMIT 1;

-- name: GetMotionByID :one
SELECT * FROM motions WHERE id = $1 LIMIT 1;

-- name: UpdateMotionStatus :one
UPDATE motions 
SET status = $2, updated_at = NOW() 
WHERE id = $1 
RETURNING *;

-- name: CreateMotion :one
INSERT INTO motions (title, description, questions, requires_totp, status) 
VALUES ($1, $2, $3, $4, 'PENDING') 
RETURNING *;

-- name: RegisterVoter :one
INSERT INTO voter_registry (hashed_email) 
VALUES ($1) 
ON CONFLICT (hashed_email) DO UPDATE SET is_present = EXCLUDED.is_present 
RETURNING *;

-- name: CheckVoterAllowed :one
SELECT EXISTS (
    SELECT 1 FROM allowed_voters 
    WHERE motion_id = $1 AND hashed_email = $2
);

-- name: RecordVoterReceipt :one
INSERT INTO voter_receipts (motion_id, hashed_email, receipt_hash) 
VALUES ($1, $2, $3) 
RETURNING *;

-- name: RecordAnonymousVote :one
INSERT INTO anonymous_votes (motion_id, vote_data, created_at) 
VALUES ($1, $2, $3) 
RETURNING *;

-- name: HasVoterVoted :one
SELECT EXISTS (
    SELECT 1 FROM voter_receipts 
    WHERE motion_id = $1 AND hashed_email = $2
);

-- name: GetAllMotions :many
SELECT * FROM motions ORDER BY created_at ASC;

-- name: GetVoteCount :one
SELECT COUNT(*)::int as count FROM anonymous_votes WHERE motion_id = $1;

-- name: GetMotionVoteData :many
SELECT vote_data FROM anonymous_votes WHERE motion_id = $1;

-- name: UpdateMotionContent :one
UPDATE motions 
SET title = $2, description = $3, questions = $4, requires_totp = $5, updated_at = NOW()
WHERE id = $1 AND status = 'PENDING'
RETURNING *;

-- name: DeleteMotion :exec
DELETE FROM motions WHERE id = $1;
