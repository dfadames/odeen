package api

import (
	"encoding/json"
	"net/http"

	"github.com/dfadames/voting-backend/internal/auth"
	"github.com/dfadames/voting-backend/internal/db"
	"github.com/dfadames/voting-backend/internal/engine"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type AdminHandler struct {
	queries *db.Queries
	sse     *SSEHub
	totp    *engine.TOTPState
}

func NewAdminHandler(queries *db.Queries, sse *SSEHub, totp *engine.TOTPState) *AdminHandler {
	return &AdminHandler{
		queries: queries,
		sse:     sse,
		totp:    totp,
	}
}

// Login validates the one-time SETUP_TOKEN and returns the persistent AdminJWT
func (h *AdminHandler) Login(c *gin.Context) {
	var body struct {
		Token string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos de inicio de sesión inválidos"})
		return
	}

	if !auth.ValidateSetupToken(body.Token) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token de configuración inválido"})
		return
	}

	adminJWT, err := auth.GenerateAdminJWT()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo generar el token de administrador"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": adminJWT,
		"type":  "admin",
	})
}

// CreateMotion creates a new poll in PENDING state
func (h *AdminHandler) CreateMotion(c *gin.Context) {
	var body struct {
		Title        string          `json:"title" binding:"required"`
		Description  string          `json:"description"`
		Questions    json.RawMessage `json:"questions"`
		RequiresTotp *bool           `json:"requires_totp"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	requiresTotp := true
	if body.RequiresTotp != nil {
		requiresTotp = *body.RequiresTotp
	}

	motion, err := h.queries.CreateMotion(c.Request.Context(), db.CreateMotionParams{
		Title:        body.Title,
		Description:  pgtype.Text{String: body.Description, Valid: body.Description != ""},
		Questions:    body.Questions,
		RequiresTotp: pgtype.Bool{Bool: requiresTotp, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al crear la moción"})
		return
	}

	c.JSON(http.StatusOK, motion)
}

// UpdateMotion modifies an existing PENDING motion
func (h *AdminHandler) UpdateMotion(c *gin.Context) {
	motionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	var body struct {
		Title        string          `json:"title"`
		Description  string          `json:"description"`
		Questions    json.RawMessage `json:"questions"`
		RequiresTotp *bool           `json:"requires_totp"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	requiresTotp := true
	if body.RequiresTotp != nil {
		requiresTotp = *body.RequiresTotp
	}

	motion, err := h.queries.UpdateMotionContent(c.Request.Context(), db.UpdateMotionContentParams{
		ID:           motionID,
		Title:        body.Title,
		Description:  pgtype.Text{String: body.Description, Valid: body.Description != ""},
		Questions:    body.Questions,
		RequiresTotp: pgtype.Bool{Bool: requiresTotp, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo actualizar la moción, puede que ya no esté pendiente."})
		return
	}

	c.JSON(http.StatusOK, motion)
}

// UpdateMotionStatus sets a motion LIVE, PENDING, or COMPLETED
func (h *AdminHandler) UpdateMotionStatus(c *gin.Context) {
	motionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de moción inválido"})
		return
	}

	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	statusStr := pgtype.Text{String: body.Status, Valid: true}

	motion, err := h.queries.UpdateMotionStatus(c.Request.Context(), db.UpdateMotionStatusParams{
		ID:     motionID,
		Status: statusStr,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al actualizar el estado"})
		return
	}

	// Trigger side effects
	switch body.Status {
	case "LIVE":
		if motion.RequiresTotp.Bool {
			h.totp.Start()
		}
		h.sse.BroadcastToVoters("MOTION_STARTED", motion)
	case "COMPLETED":
		h.totp.Stop()
		h.sse.BroadcastToVoters("MOTION_ENDED", motion)
	}

	c.JSON(http.StatusOK, motion)
}

// Broadcasts real-time vote count locally (to be triggered periodically)
func (h *AdminHandler) BroadcastVoteCount(motionID uuid.UUID, totalVotes int) {
	h.sse.BroadcastToProjector("VOTE_COUNT", gin.H{
		"motion_id":   motionID,
		"total_votes": totalVotes,
	})
}

type MotionResult struct {
	Label string `json:"label"`
	Value int    `json:"value"`
	Color string `json:"color"`
}

type MotionResponse struct {
	db.Motion
	TotalVotes int            `json:"totalVotes"`
	Results    []MotionResult `json:"results"`
}

// GetAllMotions retrieves the entire agenda for the admin, embedding results for completed motions
func (h *AdminHandler) GetAllMotions(c *gin.Context) {
	motions, err := h.queries.GetAllMotions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al obtener las mociones"})
		return
	}

	var responses []MotionResponse
	for _, m := range motions {
		resp := MotionResponse{
			Motion:     m,
			TotalVotes: 0,
			Results:    make([]MotionResult, 0),
		}

		if m.Status.Valid && m.Status.String == "COMPLETED" {
			voteDatas, err := h.queries.GetMotionVoteData(c.Request.Context(), m.ID)
			if err == nil {
				resp.TotalVotes = len(voteDatas)

				// Tally answers
				tally := make(map[string]int)
				for _, vd := range voteDatas {
					var voteMap map[string]interface{}
					if err := json.Unmarshal(vd, &voteMap); err == nil {
						for _, val := range voteMap {
							switch v := val.(type) {
							case string:
								tally[v]++
							case []interface{}:
								for _, item := range v {
									if strItem, ok := item.(string); ok {
										tally[strItem]++
									}
								}
							}
						}
					}
				}

				colors := []string{
					"hsl(var(--chart-1))",
					"hsl(var(--chart-2))",
					"hsl(var(--chart-3))",
					"hsl(var(--chart-4))",
					"hsl(var(--chart-5))",
				}

				colorIdx := 0
				for label, count := range tally {
					resp.Results = append(resp.Results, MotionResult{
						Label: label,
						Value: count,
						Color: colors[colorIdx%len(colors)],
					})
					colorIdx++
				}
			}
		}

		responses = append(responses, resp)
	}

	c.JSON(http.StatusOK, responses)
}

// DeleteMotion handles deleting a motion from the admin dashboard
func (h *AdminHandler) DeleteMotion(c *gin.Context) {
	motionIDPath := c.Param("id")
	motionID, err := uuid.Parse(motionIDPath)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID de moción inválido"})
		return
	}

	err = h.queries.DeleteMotion(c.Request.Context(), motionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al eliminar la moción o tiene datos relacionados"})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetVoteCount returns the number of votes for a given motion
func (h *AdminHandler) GetVoteCount(c *gin.Context) {
	motionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}
	count, err := h.queries.GetVoteCount(c.Request.Context(), motionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al obtener conteo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}
