package engine

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"sync"
	"time"
)

type TOTPState struct {
	CurrentCode   string
	ValidCodes    []string
	ValidUntil    time.Time
	mu            sync.RWMutex
	isActive      bool
	broadcastChan chan string
}

func NewTOTPState() *TOTPState {
	return &TOTPState{
		broadcastChan: make(chan string, 100),
	}
}

// Start generating codes every 30 seconds
func (t *TOTPState) Start() {
	t.mu.Lock()
	if t.isActive {
		t.mu.Unlock()
		return
	}
	t.isActive = true
	t.mu.Unlock()

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		t.generateNext()
		for {
			t.mu.RLock()
			active := t.isActive
			t.mu.RUnlock()
			if !active {
				return
			}

			select {
			case <-ticker.C:
				t.generateNext()
			}
		}
	}()
}

// Stop generation immediately
func (t *TOTPState) Stop() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.isActive = false
	t.CurrentCode = ""
	t.ValidCodes = nil
}

func (t *TOTPState) generateNext() {
	t.mu.Lock()
	defer t.mu.Unlock()

	// Generate random 6-digit string securely
	code, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		t.CurrentCode = "000000"
	} else {
		t.CurrentCode = fmt.Sprintf("%06d", code.Int64())
	}

	// Keep a rolling window of the last 10 codes (5 minutes validity)
	t.ValidCodes = append([]string{t.CurrentCode}, t.ValidCodes...)
	if len(t.ValidCodes) > 10 {
		t.ValidCodes = t.ValidCodes[:10]
	}

	t.ValidUntil = time.Now().Add(30 * time.Second)

	// Notify broadcasters without blocking
	select {
	case t.broadcastChan <- t.CurrentCode:
	default:
	}
}

// Validate checks if the user's code matches the current or last 10 codes
// (giving a 5 minute grace period for submission lag)
func (t *TOTPState) Validate(code string) bool {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if !t.isActive || code == "" {
		return false
	}

	for _, c := range t.ValidCodes {
		if c == code {
			return true
		}
	}
	return false
}

func (t *TOTPState) Active() bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.isActive
}

func (t *TOTPState) GetBroadcastChannel() <-chan string {
	return t.broadcastChan
}
