package engine

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/dfadames/voting-backend/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// VoteTask represents a vote to be securely recorded in the double ledger.
type VoteTask struct {
	MotionID    uuid.UUID
	HashedEmail string
	VoteData    []byte // JSONB
	ReceiptHash string
}

type WorkerPool struct {
	dbPool    *pgxpool.Pool
	queries   *db.Queries
	voteQueue chan VoteTask
	workers   int
}

func NewWorkerPool(dbPool *pgxpool.Pool, workers int) *WorkerPool {
	return &WorkerPool{
		dbPool:    dbPool,
		queries:   db.New(dbPool),
		voteQueue: make(chan VoteTask, 5000), // Buffer size for up to 5000 concurrent votes
		workers:   workers,
	}
}

// Start spawns the goroutines listening to the voteQueue
func (wp *WorkerPool) Start() {
	for i := 0; i < wp.workers; i++ {
		go wp.worker(i)
	}
	log.Printf("Worker pool started with %d workers", wp.workers)
}

func (wp *WorkerPool) SubmitVote(task VoteTask) bool {
	select {
	case wp.voteQueue <- task:
		return true
	default:
		return false
	}
}

func (wp *WorkerPool) worker(id int) {
	for task := range wp.voteQueue {
		// Asynchronous Execution
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		err := wp.processVote(ctx, task)
		if err != nil {
			log.Printf("[Worker %d] Failed to process vote for motion %s: %v", id, task.MotionID, err)
		}
		cancel()
	}
}

func (wp *WorkerPool) processVote(ctx context.Context, task VoteTask) error {
	// 1. Transaction guarantees ACID atomicity for the double ledger insertion
	tx, err := wp.dbPool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	qtx := wp.queries.WithTx(tx)

	// Temporal Anti-Correlation: Add random jitter (50ms - 250ms)
	// before committing the anonymous vote to prevent timing analysis.
	jitter := time.Duration(rand.Intn(200)+50) * time.Millisecond

	// 2. Record the receipt (WHO voted)
	_, err = qtx.RecordVoterReceipt(ctx, db.RecordVoterReceiptParams{
		MotionID:    task.MotionID,
		HashedEmail: task.HashedEmail,
		ReceiptHash: task.ReceiptHash,
	})
	if err != nil {
		// If they already voted or other issue, it fails the transaction
		return fmt.Errorf("receipt failure: %w", err)
	}

	// Wait the jitter time
	time.Sleep(jitter)

	// 3. Record the vote (WHAT was voted) - No reference back to the user
	// Note: We create a distinct created_at timestamp inside the query using NOW()
	// so the exact millisecond doesn't match the receipt.
	_, err = qtx.RecordAnonymousVote(ctx, db.RecordAnonymousVoteParams{
		MotionID: task.MotionID,
		VoteData: task.VoteData,
	})
	if err != nil {
		return fmt.Errorf("anonymous vote failure: %w", err)
	}

	// 4. Commit Double Ledger
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit failure: %w", err)
	}

	return nil
}
