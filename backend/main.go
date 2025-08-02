package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/gin-gonic/gin"
)

var ginLambda *ginadapter.GinLambda

func init() {
	// Gin router setup
	r := gin.Default()
	
	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})
	
	// Routes
	setupRoutes(r)
	
	ginLambda = ginadapter.New(r)
}

func setupRoutes(r *gin.Engine) {
	// Handle both with and without stage prefix
	api := r.Group("/api")
	{
		// Health check
		api.GET("/health", healthCheck)
		
		// Game routes
		game := api.Group("/game")
		{
			game.POST("/score", submitScore)
			game.GET("/leaderboard", getLeaderboard)
		}
	}
	
	// Also handle routes with stage prefix
	stageApi := r.Group("/production/api")
	{
		// Health check
		stageApi.GET("/health", healthCheck)
		
		// Game routes
		stageGame := stageApi.Group("/game")
		{
			stageGame.POST("/score", submitScore)
			stageGame.GET("/leaderboard", getLeaderboard)
		}
	}
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"message": "Typing Game API is running",
	})
}

func submitScore(c *gin.Context) {
	var scoreData struct {
		PlayerName string `json:"player_name" binding:"required"`
		Score      int    `json:"score" binding:"required"`
		Round      int    `json:"round" binding:"required"`
		Time       int    `json:"time" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&scoreData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// 入力検証
	if len(scoreData.PlayerName) > 20 || len(scoreData.PlayerName) < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Player name must be 1-20 characters"})
		return
	}
	
	if scoreData.Score < 0 || scoreData.Score > 1000000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid score range"})
		return
	}
	
	if scoreData.Round < 1 || scoreData.Round > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid round"})
		return
	}
	
	if scoreData.Time < 0 || scoreData.Time > 3600 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time"})
		return
	}
	
	// TODO: Save to DynamoDB
	log.Printf("Score submitted: %+v", scoreData)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Score submitted successfully",
		"data":    scoreData,
	})
}

func getLeaderboard(c *gin.Context) {
	// TODO: Get from DynamoDB
	leaderboard := []gin.H{
		{"rank": 1, "player_name": "Player1", "score": 15000, "round": 5},
		{"rank": 2, "player_name": "Player2", "score": 12000, "round": 4},
		{"rank": 3, "player_name": "Player3", "score": 10000, "round": 3},
	}
	
	c.JSON(http.StatusOK, gin.H{
		"leaderboard": leaderboard,
	})
}

func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return ginLambda.ProxyWithContext(ctx, req)
}

func main() {
	if os.Getenv("AWS_LAMBDA_RUNTIME_API") != "" {
		// Running in Lambda
		lambda.Start(Handler)
	} else {
		// Running locally
		r := gin.Default()
		
		// CORS middleware
		r.Use(func(c *gin.Context) {
			c.Header("Access-Control-Allow-Origin", "*")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
			
			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
			
			c.Next()
		})
		
		setupRoutes(r)
		log.Println("Server starting on :8080")
		r.Run(":8080")
	}
}
