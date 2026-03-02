package api

import (
	"encoding/json"
	"io"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type SSEHub struct {
	voterClients     map[chan string]bool
	projectorClients map[chan string]bool
	mu               sync.RWMutex
}

func NewSSEHub() *SSEHub {
	return &SSEHub{
		voterClients:     make(map[chan string]bool),
		projectorClients: make(map[chan string]bool),
	}
}

// BroadcastToVoters sends state changes to the Waiting Room/Ballots
func (hub *SSEHub) BroadcastToVoters(event string, data interface{}) {
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	payload, _ := json.Marshal(map[string]interface{}{
		"event": event,
		"data":  data,
	})

	for clientChan := range hub.voterClients {
		select {
		case clientChan <- string(payload):
		default: // Non-blocking drop
		}
	}
}

// BroadcastToProjector sends TOTP codes or live counts
func (hub *SSEHub) BroadcastToProjector(event string, data interface{}) {
	hub.mu.RLock()
	defer hub.mu.RUnlock()

	payload, _ := json.Marshal(map[string]interface{}{
		"event": event,
		"data":  data,
	})

	for clientChan := range hub.projectorClients {
		select {
		case clientChan <- string(payload):
		default:
		}
	}
}

// VoterHandler serves SSE for voters
func (hub *SSEHub) VoterHandler(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	clientChan := make(chan string, 10)
	hub.mu.Lock()
	hub.voterClients[clientChan] = true
	hub.mu.Unlock()

	defer func() {
		hub.mu.Lock()
		delete(hub.voterClients, clientChan)
		hub.mu.Unlock()
		close(clientChan)
	}()

	c.Stream(func(w io.Writer) bool {
		select {
		case msg := <-clientChan:
			c.SSEvent("message", msg)
			return true
		case <-c.Writer.CloseNotify():
			return false
		case <-time.After(15 * time.Second):
			// Ping to keep connection alive
			c.SSEvent("ping", "ping")
			return true
		}
	})
}

// ProjectorHandler serves SSE for projector view
func (hub *SSEHub) ProjectorHandler(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")

	clientChan := make(chan string, 10)
	hub.mu.Lock()
	hub.projectorClients[clientChan] = true
	hub.mu.Unlock()

	defer func() {
		hub.mu.Lock()
		delete(hub.projectorClients, clientChan)
		hub.mu.Unlock()
		close(clientChan)
	}()

	c.Stream(func(w io.Writer) bool {
		select {
		case msg := <-clientChan:
			c.SSEvent("message", msg)
			return true
		case <-c.Writer.CloseNotify():
			return false
		case <-time.After(15 * time.Second):
			c.SSEvent("ping", "ping")
			return true
		}
	})
}
