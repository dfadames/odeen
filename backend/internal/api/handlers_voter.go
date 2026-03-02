package api

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/dfadames/voting-backend/internal/db"
	"github.com/dfadames/voting-backend/internal/engine"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type VoterHandler struct {
	queries      *db.Queries
	worker       *engine.WorkerPool
	totp         *engine.TOTPState
	totpSessions sync.Map
}

func NewVoterHandler(queries *db.Queries, worker *engine.WorkerPool, totp *engine.TOTPState) *VoterHandler {
	return &VoterHandler{
		queries: queries,
		worker:  worker,
		totp:    totp,
	}
}

// GetLiveMotion fetched the current active motion (if any)
func (h *VoterHandler) GetLiveMotion(c *gin.Context) {
	hashedEmail := c.MustGet("hashed_email").(string)

	motion, err := h.queries.GetLiveMotion(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No hay mociones activas disponibles"})
		return
	}

	// Check if already voted
	hasVoted, _ := h.queries.HasVoterVoted(c.Request.Context(), db.HasVoterVotedParams{
		MotionID:    motion.ID,
		HashedEmail: hashedEmail,
	})

	c.JSON(http.StatusOK, gin.H{
		"id":            motion.ID,
		"title":         motion.Title,
		"description":   motion.Description.String,
		"questions":     motion.Questions,
		"requires_totp": motion.RequiresTotp.Bool,
		"status":        motion.Status.String,
		"has_voted":     hasVoted,
	})
}

// ValidateTOTP authenticates a voter for the current live motion session
func (h *VoterHandler) ValidateTOTP(c *gin.Context) {
	hashedEmail := c.MustGet("hashed_email").(string)

	motionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de moción inválido"})
		return
	}

	var body struct {
		Code string `json:"code"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cuerpo de solicitud inválido"})
		return
	}

	if body.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requiere el código de presencia"})
		return
	}

	if h.totp.Validate(body.Code) {
		sessionKey := motionID.String() + "_" + hashedEmail
		h.totpSessions.Store(sessionKey, true)
		c.JSON(http.StatusOK, gin.H{"status": "authorized"})
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Código de presencia inválido o expirado"})
	}
}

// SubmitVote places the anonymous vote into the Worker Pool channel
func (h *VoterHandler) SubmitVote(c *gin.Context) {
	hashedEmail := c.MustGet("hashed_email").(string)

	motionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de moción inválido"})
		return
	}

	var body struct {
		VoteData gin.H `json:"vote_data"` // We no longer strictly need "code" here
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.VoteData == nil {
		body.VoteData = gin.H{}
	}

	// Fetch motion to check if TOTP is required
	motion, err := h.queries.GetMotionByID(c.Request.Context(), motionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Moción no encontrada"})
		return
	}

	// Only validate TOTP if the motion requires it
	if motion.RequiresTotp.Bool {
		sessionKey := motionID.String() + "_" + hashedEmail
		if _, ok := h.totpSessions.Load(sessionKey); !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Sesión de presencia no autorizada. Retorna e ingresa el código."})
			return
		}
	}

	// Check if already voted (fast path, DB transaction deals with race conditions safely)
	hasVoted, _ := h.queries.HasVoterVoted(c.Request.Context(), db.HasVoterVotedParams{
		MotionID:    motionID,
		HashedEmail: hashedEmail,
	})
	if hasVoted {
		c.JSON(http.StatusConflict, gin.H{"error": "Ya has votado en esta moción"})
		return
	}

	voteBytes, _ := json.Marshal(body.VoteData)
	receiptHash := uuid.New().String()

	// 2. Transmit to Async Worker Pool
	task := engine.VoteTask{
		MotionID:    motionID,
		HashedEmail: hashedEmail,
		VoteData:    voteBytes,
		ReceiptHash: receiptHash,
	}

	if h.worker.SubmitVote(task) {
		c.JSON(http.StatusAccepted, gin.H{
			"status":       "processing",
			"receipt_hash": receiptHash,
		})
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Sistema bajo carga extrema, por favor reintenta al instante"})
	}
}
