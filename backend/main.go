package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/dfadames/voting-backend/internal/api"
	"github.com/dfadames/voting-backend/internal/auth"
	"github.com/dfadames/voting-backend/internal/db"
	"github.com/dfadames/voting-backend/internal/engine"
)

func main() {
	_ = godotenv.Load() // Ignore error if .env doesn't exist

	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/assembly?sslmode=disable"
	}

	// 1. Initialize PostgreSQL connection pool
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	queries := db.New(pool)

	// 2. Initialize Real-Time & Concurrency Engines
	sseHub := api.NewSSEHub()
	totp := engine.NewTOTPState()

	// Pipe TOTP codes to the Projector SSE streams
	go func() {
		for code := range totp.GetBroadcastChannel() {
			sseHub.BroadcastToProjector("TOTP_UPDATE", map[string]string{"code": code})
		}
	}()

	backgroundWorkers := 50 // Worker pool depth for vote insertion
	workerPool := engine.NewWorkerPool(pool, backgroundWorkers)
	workerPool.Start()

	// 3. Initialize REST Handlers
	adminHandler := api.NewAdminHandler(queries, sseHub, totp)
	voterHandler := api.NewVoterHandler(queries, workerPool, totp)

	// Initialize router
	r := gin.Default()

	// Print the Admin Setup Token securely on startup
	log.Println("================================================================")
	log.Println("🔑  ADMIN SETUP TOKEN FOR THIS SESSION  🔑")
	log.Printf("Token: %s\n", auth.GetSetupToken())
	log.Println("Use this token in the UI to gain Moderator/Admin access.")
	log.Println("================================================================")

	// Configure CORS - restrict to frontend origin only
	frontendOrigin := os.Getenv("NEXT_PUBLIC_BASE_URL")
	if frontendOrigin == "" {
		frontendOrigin = "http://localhost:3000"
	}
	r.Use(func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else if frontendOrigin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", frontendOrigin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// --------- PUBLIC ROUTES ---------
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/api/auth/google", func(c *gin.Context) {
		var req struct {
			Email string `json:"email"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Solicitud inválida"})
			return
		}

		if !auth.ValidateDomain(req.Email) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Dominio institucional no reconocido"})
			return
		}

		hashedEmail := auth.HashEmail(req.Email)
		token, err := auth.GenerateJWT(hashedEmail)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo generar el token de autenticación"})
			return
		}

		// Register in DB census
		_, _ = queries.RegisterVoter(context.Background(), hashedEmail)

		c.JSON(http.StatusOK, gin.H{"token": token, "type": "voter"})
	})

	// Server-Sent Events endpoints
	r.GET("/api/events/voter", sseHub.VoterHandler)
	r.GET("/api/events/projector", sseHub.ProjectorHandler)

	// --------- VOTER ROUTES (Requires JWT) ---------
	voterGroup := r.Group("/api/voter")
	voterGroup.Use(auth.AuthMiddleware())
	{
		voterGroup.GET("/motions/live", voterHandler.GetLiveMotion)
		voterGroup.POST("/motions/:id/totp", voterHandler.ValidateTOTP)
		voterGroup.POST("/motions/:id/vote", voterHandler.SubmitVote)
	}

	// --------- ADMIN ROUTES ---------
	adminGroup := r.Group("/api/admin")
	{
		// 1. Initial login (Provisioning) using setup token
		adminGroup.POST("/login", adminHandler.Login)

		// 2. Protected admin logic
		protectedAdmin := adminGroup.Group("")
		protectedAdmin.Use(auth.AdminAuthMiddleware())
		{
			protectedAdmin.GET("/motions", adminHandler.GetAllMotions)
			protectedAdmin.POST("/motions", adminHandler.CreateMotion)
			protectedAdmin.PUT("/motions/:id", adminHandler.UpdateMotion)
			protectedAdmin.PUT("/motions/:id/status", adminHandler.UpdateMotionStatus)
			protectedAdmin.GET("/motions/:id/votes", adminHandler.GetVoteCount)
			protectedAdmin.DELETE("/motions/:id", adminHandler.DeleteMotion)
		}
	}

	log.Println("Starting voting backend on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
