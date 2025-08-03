package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/awslabs/aws-lambda-go-api-proxy/gin"
	"github.com/gin-gonic/gin"
)

var ginLambda *ginadapter.GinLambda
var dynamoClient *dynamodb.Client

type ScoreItem struct {
	PlayerName string `dynamodbav:"player_name"`
	Score      int    `dynamodbav:"score"`
	Round      int    `dynamodbav:"round"`
	Time       int    `dynamodbav:"time"`
	Timestamp  int64  `dynamodbav:"timestamp"`
	ScoreType  string `dynamodbav:"score_type"`
}

type LeaderboardItem struct {
	PlayerName string `dynamodbav:"player_name" json:"player_name"`
	Score      int    `dynamodbav:"score" json:"score"`
	Round      int    `dynamodbav:"round" json:"round"`
	Rank       int    `dynamodbav:"rank" json:"rank"`
}

type WordItem struct {
	Category string `dynamodbav:"category" json:"category"`
	WordID   string `dynamodbav:"word_id" json:"word_id"`
	Word     string `dynamodbav:"word" json:"word"`
	Round    int    `dynamodbav:"round" json:"round"`
	Type     string `dynamodbav:"type" json:"type"` // "normal", "bonus", "debuff"
}

func init() {
	// Initialize DynamoDB client
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}
	dynamoClient = dynamodb.NewFromConfig(cfg)

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
			game.GET("/words/:round", getWords)
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
			stageGame.GET("/words/:round", getWords)
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
		Score      int    `json:"score" binding:"required,min=0"`
		Round      int    `json:"round" binding:"required,min=1,max=5"`
		Time       int    `json:"time" binding:"min=0"`
	}
	
	if err := c.ShouldBindJSON(&scoreData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// 入力検証（文字数で計算、UTF-8対応）
	playerNameRunes := []rune(scoreData.PlayerName)
	if len(playerNameRunes) > 20 || len(playerNameRunes) < 1 {
		log.Printf("Player name validation failed: '%s' has %d characters (bytes: %d)", scoreData.PlayerName, len(playerNameRunes), len(scoreData.PlayerName))
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
	
	// Save to DynamoDB
	err := saveScore(scoreData.PlayerName, scoreData.Score, scoreData.Round, scoreData.Time)
	if err != nil {
		log.Printf("Failed to save score for player %s: %v", scoreData.PlayerName, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save score", "details": err.Error()})
		return
	}

	// Update leaderboard
	err = updateLeaderboard(scoreData.PlayerName, scoreData.Score, scoreData.Round)
	if err != nil {
		log.Printf("Failed to update leaderboard for player %s: %v", scoreData.PlayerName, err)
		// Continue even if leaderboard update fails
	}
	
	log.Printf("Score submitted successfully: %+v", scoreData)
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Score submitted successfully",
		"data":    scoreData,
	})
}

func getLeaderboard(c *gin.Context) {
	leaderboard, err := fetchLeaderboard()
	if err != nil {
		log.Printf("Failed to fetch leaderboard: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch leaderboard"})
		return
	}
	
	log.Printf("Returning leaderboard data: %+v", leaderboard)
	
	c.JSON(http.StatusOK, gin.H{
		"leaderboard": leaderboard,
	})
}

func getWords(c *gin.Context) {
	roundStr := c.Param("round")
	round, err := strconv.Atoi(roundStr)
	if err != nil || round < 1 || round > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid round parameter"})
		return
	}

	words, err := fetchWords(round)
	if err != nil {
		log.Printf("Failed to fetch words for round %d: %v", round, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch words"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"words": words,
		"round": round,
	})
}

func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return ginLambda.ProxyWithContext(ctx, req)
}

// DynamoDB operations
func saveScore(playerName string, score, round, gameTime int) error {
	scoresTable := os.Getenv("SCORES_TABLE_NAME")
	if scoresTable == "" {
		log.Printf("Environment variables: SCORES_TABLE_NAME=%s", scoresTable)
		return fmt.Errorf("SCORES_TABLE_NAME environment variable not set")
	}
	
	log.Printf("Saving score to table: %s, player: %s, score: %d", scoresTable, playerName, score)

	item := ScoreItem{
		PlayerName: playerName,
		Score:      score,
		Round:      round,
		Time:       gameTime,
		Timestamp:  time.Now().Unix(),
		ScoreType:  "game", // GSI用の固定値
	}

	av, err := attributevalue.MarshalMap(item)
	if err != nil {
		return fmt.Errorf("failed to marshal score item: %w", err)
	}

	_, err = dynamoClient.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(scoresTable),
		Item:      av,
	})

	return err
}

func updateLeaderboard(playerName string, score, round int) error {
	leaderboardTable := os.Getenv("LEADERBOARD_TABLE_NAME")
	if leaderboardTable == "" {
		return fmt.Errorf("LEADERBOARD_TABLE_NAME environment variable not set")
	}

	// Check if player already exists
	getResult, err := dynamoClient.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(leaderboardTable),
		Key: map[string]types.AttributeValue{
			"player_name": &types.AttributeValueMemberS{Value: playerName},
		},
	})

	if err != nil {
		return fmt.Errorf("failed to get existing leaderboard entry: %w", err)
	}

	// Update only if new score is higher
	shouldUpdate := true
	if getResult.Item != nil {
		var existingItem LeaderboardItem
		err = attributevalue.UnmarshalMap(getResult.Item, &existingItem)
		if err == nil && existingItem.Score >= score {
			shouldUpdate = false
		}
	}

	if shouldUpdate {
		item := LeaderboardItem{
			PlayerName: playerName,
			Score:      score,
			Round:      round,
			Rank:       0, // Will be calculated when fetching
		}

		av, err := attributevalue.MarshalMap(item)
		if err != nil {
			return fmt.Errorf("failed to marshal leaderboard item: %w", err)
		}

		_, err = dynamoClient.PutItem(context.TODO(), &dynamodb.PutItemInput{
			TableName: aws.String(leaderboardTable),
			Item:      av,
		})

		return err
	}

	return nil
}

func fetchLeaderboard() ([]LeaderboardItem, error) {
	leaderboardTable := os.Getenv("LEADERBOARD_TABLE_NAME")
	if leaderboardTable == "" {
		return nil, fmt.Errorf("LEADERBOARD_TABLE_NAME environment variable not set")
	}

	result, err := dynamoClient.Scan(context.TODO(), &dynamodb.ScanInput{
		TableName: aws.String(leaderboardTable),
	})

	if err != nil {
		return nil, fmt.Errorf("failed to scan leaderboard table: %w", err)
	}

	var items []LeaderboardItem
	err = attributevalue.UnmarshalListOfMaps(result.Items, &items)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal leaderboard items: %w", err)
	}

	// Sort by score (descending) and assign ranks
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if items[j].Score > items[i].Score {
				items[i], items[j] = items[j], items[i]
			}
		}
	}

	// Assign ranks
	for i := range items {
		items[i].Rank = i + 1
	}

	// Return top 30
	if len(items) > 30 {
		items = items[:30]
	}

	return items, nil
}

func fetchWords(round int) ([]WordItem, error) {
	wordsTable := os.Getenv("WORDS_TABLE_NAME")
	if wordsTable == "" {
		return nil, fmt.Errorf("WORDS_TABLE_NAME environment variable not set")
	}

	// GSIを使用してラウンド別に単語を取得
	result, err := dynamoClient.Query(context.TODO(), &dynamodb.QueryInput{
		TableName: aws.String(wordsTable),
		IndexName: aws.String("RoundIndex"),
		KeyConditionExpression: aws.String("#round = :round"),
		ExpressionAttributeNames: map[string]string{
			"#round": "round",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":round": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", round)},
		},
	})

	if err != nil {
		return nil, fmt.Errorf("failed to query words table: %w", err)
	}

	var words []WordItem
	err = attributevalue.UnmarshalListOfMaps(result.Items, &words)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal words: %w", err)
	}

	log.Printf("Fetched %d words for round %d", len(words), round)
	return words, nil
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
