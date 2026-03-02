package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var (
	jwtKey     = []byte(getEnvOrDefault("JWT_SECRET", "super_secret_jwt_key"))
	pepper     = []byte(getEnvOrDefault("PEPPER_SECRET", "super_secret_pepper_for_local_dev"))
	domain     = getEnvOrDefault("ALLOWED_DOMAIN", "@unal.edu.co")
	setupToken = getEnvOrDefault("ADMIN_SETUP_TOKEN", "local_admin_token_2026")
)

func getEnvOrDefault(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// CustomClaims represents the JWT payload
type CustomClaims struct {
	HashedEmail string `json:"hashed_email"`
	jwt.RegisteredClaims
}

// HashEmail peppers and hashes the email for anonymity
func HashEmail(email string) string {
	mac := hmac.New(sha256.New, pepper)
	mac.Write([]byte(strings.ToLower(strings.TrimSpace(email))))
	return hex.EncodeToString(mac.Sum(nil))
}

// GenerateJWT creates a stateless token for the user
func GenerateJWT(hashedEmail string) (string, error) {
	claims := CustomClaims{
		HashedEmail: hashedEmail,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// ValidateSetupToken checks if the provided string matches ADMIN_SETUP_TOKEN
func ValidateSetupToken(token string) bool {
	return token == setupToken
}

// GetSetupToken returns the current setup token for logging purposes on startup
func GetSetupToken() string {
	return setupToken
}

// GenerateAdminJWT creates a stateless token specifically identifying the Admin
func GenerateAdminJWT() (string, error) {
	claims := CustomClaims{
		HashedEmail: "admin_superuser",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(12 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   "admin",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// AdminAuthMiddleware validates the JWT and ensures the Subject is "admin"
func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Se requiere el encabezado de autorización"})
			c.Abort()
			return
		}

		parts := strings.Split(tokenString, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Formato de token inválido"})
			c.Abort()
			return
		}

		token, err := jwt.ParseWithClaims(parts[1], &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(*CustomClaims); ok {
			if claims.Subject != "admin" {
				c.JSON(http.StatusForbidden, gin.H{"error": "Se requieren privilegios de administrador"})
				c.Abort()
				return
			}
			c.Set("is_admin", true)
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Formato de claims inválido"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AuthMiddleware validates the JWT on private routes
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Se requiere el encabezado de autorización"})
			c.Abort()
			return
		}

		parts := strings.Split(tokenString, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Formato de token inválido"})
			c.Abort()
			return
		}

		token, err := jwt.ParseWithClaims(parts[1], &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method")
			}
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token inválido"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(*CustomClaims); ok {
			c.Set("hashed_email", claims.HashedEmail)
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Formato de claims inválido"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ValidateDomain checks if email belongs to allowed institution
func ValidateDomain(email string) bool {
	return strings.HasSuffix(strings.ToLower(email), domain)
}
