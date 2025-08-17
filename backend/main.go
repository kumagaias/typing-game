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
	Category   string `dynamodbav:"category"`
	Timestamp  int64  `dynamodbav:"timestamp"`
	ScoreType  string `dynamodbav:"score_type"`
}

type LeaderboardItem struct {
	PlayerName string `dynamodbav:"player_name" json:"player_name"`
	Score      int    `dynamodbav:"score" json:"score"`
	Round      int    `dynamodbav:"round" json:"round"`
	Category   string `dynamodbav:"category" json:"category"`
	Rank       int    `dynamodbav:"rank" json:"rank"`
}

type WordItem struct {
	Category string `dynamodbav:"category" json:"category"`
	WordID   string `dynamodbav:"word_id" json:"word_id"`
	Word     string `dynamodbav:"word" json:"word"`
	Round    int    `dynamodbav:"round" json:"round"`
	Type     string `dynamodbav:"type" json:"type"` // "normal", "bonus", "debuff"
	Language string `dynamodbav:"language" json:"language"`
}

type TranslationItem struct {
	WordID      string `dynamodbav:"word_id" json:"word_id"`
	Language    string `dynamodbav:"language" json:"language"`
	Translation string `dynamodbav:"translation" json:"translation"`
	Category    string `dynamodbav:"category" json:"category"`
	CreatedAt   string `dynamodbav:"created_at" json:"created_at"`
	UpdatedAt   string `dynamodbav:"updated_at" json:"updated_at"`
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
			game.GET("/words/:category/:round", getWords)
			game.GET("/categories", getCategories)
			game.GET("/translation/:word_id", getTranslation)
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
			stageGame.GET("/words/:category/:round", getWords)
			stageGame.GET("/categories", getCategories)
			stageGame.GET("/translation/:word_id", getTranslation)
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
		Category   string `json:"category" binding:"required"`
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
	err := saveScore(scoreData.PlayerName, scoreData.Score, scoreData.Round, scoreData.Time, scoreData.Category)
	if err != nil {
		log.Printf("Failed to save score for player %s: %v", scoreData.PlayerName, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save score", "details": err.Error()})
		return
	}

	// Update leaderboard
	err = updateLeaderboard(scoreData.PlayerName, scoreData.Score, scoreData.Round, scoreData.Category)
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
	category := c.Param("category")
	roundStr := c.Param("round")
	language := c.DefaultQuery("language", "jp") // 言語パラメータを取得（デフォルトは日本語）
	
	// カテゴリーの検証
	validCategories := []string{"beginner_words", "intermediate_words", "beginner_conversation", "intermediate_conversation"}
	isValidCategory := false
	for _, validCat := range validCategories {
		if category == validCat {
			isValidCategory = true
			break
		}
	}
	if !isValidCategory {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category parameter"})
		return
	}
	
	// 言語パラメータの検証
	validLanguages := []string{"jp", "en"}
	isValidLanguage := false
	for _, validLang := range validLanguages {
		if language == validLang {
			isValidLanguage = true
			break
		}
	}
	if !isValidLanguage {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid language parameter"})
		return
	}
	
	round, err := strconv.Atoi(roundStr)
	if err != nil || round < 1 || round > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid round parameter"})
		return
	}

	words, err := fetchWords(category, round, language)
	if err != nil {
		log.Printf("Failed to fetch words for category %s, round %d, language %s: %v", category, round, language, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch words"})
		return
	}

	log.Printf("Successfully fetched %d words for category %s, round %d, language %s", len(words), category, round, language)

	c.JSON(http.StatusOK, gin.H{
		"words": words,
		"category": category,
		"round": round,
		"language": language,
	})
}

func getCategories(c *gin.Context) {
	// 言語パラメータを取得（デフォルトは日本語）
	language := c.DefaultQuery("language", "jp")
	
	var categories []map[string]interface{}
	
	if language == "en" {
		categories = []map[string]interface{}{
			{
				"id":          "beginner_words",
				"name":        "Beginner Words",
				"description": "Basic words used in daily life",
				"icon":        "📚",
			},
			{
				"id":          "intermediate_words",
				"name":        "Intermediate Words",
				"description": "More complex and specialized words",
				"icon":        "🎓",
			},
			{
				"id":          "beginner_conversation",
				"name":        "Beginner Conversation",
				"description": "Short daily conversation expressions",
				"icon":        "💬",
			},
			{
				"id":          "intermediate_conversation",
				"name":        "Intermediate Conversation",
				"description": "More complex and longer conversation expressions",
				"icon":        "🗣️",
			},
		}
	} else {
		categories = []map[string]interface{}{
			{
				"id":          "beginner_words",
				"name":        "初級単語",
				"description": "日常生活でよく使う基本的な単語",
				"icon":        "📚",
			},
			{
				"id":          "intermediate_words",
				"name":        "中級単語",
				"description": "より複雑で専門的な単語",
				"icon":        "🎓",
			},
			{
				"id":          "beginner_conversation",
				"name":        "初級会話",
				"description": "日常的な短い会話表現",
				"icon":        "💬",
			},
			{
				"id":          "intermediate_conversation",
				"name":        "中級会話",
				"description": "より複雑で長い会話表現",
				"icon":        "🗣️",
			},
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"categories": categories,
	})
}

func Handler(ctx context.Context, req events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	return ginLambda.ProxyWithContext(ctx, req)
}

// DynamoDB operations
func saveScore(playerName string, score, round, gameTime int, category string) error {
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
		Category:   category,
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

func updateLeaderboard(playerName string, score, round int, category string) error {
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
			Category:   category,
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

func fetchWords(category string, round int, language string) ([]WordItem, error) {
	wordsTable := os.Getenv("WORDS_TABLE_NAME")
	if wordsTable == "" {
		return nil, fmt.Errorf("WORDS_TABLE_NAME environment variable not set")
	}

	// カテゴリー、ラウンド、言語で単語を取得
	result, err := dynamoClient.Query(context.TODO(), &dynamodb.QueryInput{
		TableName: aws.String(wordsTable),
		KeyConditionExpression: aws.String("category = :category"),
		FilterExpression: aws.String("#round = :round AND #language = :language"),
		ExpressionAttributeNames: map[string]string{
			"#round": "round",
			"#language": "language",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":category": &types.AttributeValueMemberS{Value: category},
			":round": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", round)},
			":language": &types.AttributeValueMemberS{Value: language},
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

	log.Printf("Successfully fetched %d words for category %s, round %d, language %s from DynamoDB", len(words), category, round, language)
	return words, nil
}

func getTranslation(c *gin.Context) {
	wordID := c.Param("word_id")
	targetLanguage := c.Query("language")
	
	if wordID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "word_id parameter is required"})
		return
	}
	
	if targetLanguage == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "language query parameter is required"})
		return
	}
	
	// 有効な言語かチェック
	validLanguages := []string{"jp", "en", "es", "fr", "de", "zh", "ko"}
	isValidLanguage := false
	for _, validLang := range validLanguages {
		if targetLanguage == validLang {
			isValidLanguage = true
			break
		}
	}
	if !isValidLanguage {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid language parameter"})
		return
	}
	
	translation, err := fetchTranslation(wordID, targetLanguage)
	if err != nil {
		log.Printf("Failed to fetch translation for word_id %s, language %s: %v", wordID, targetLanguage, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Translation not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"translation": translation,
		"word_id": wordID,
		"language": targetLanguage,
	})
}

func fetchTranslation(wordID, targetLanguage string) (string, error) {
	translationsTable := os.Getenv("TRANSLATIONS_TABLE_NAME")
	if translationsTable == "" {
		translationsTable = "typing-game-translations"
	}
	
	// DynamoDBから翻訳を取得
	result, err := dynamoClient.GetItem(context.TODO(), &dynamodb.GetItemInput{
		TableName: aws.String(translationsTable),
		Key: map[string]types.AttributeValue{
			"word_id": &types.AttributeValueMemberS{
				Value: wordID,
			},
			"language": &types.AttributeValueMemberS{
				Value: targetLanguage,
			},
		},
	})
	
	if err != nil {
		return "", fmt.Errorf("failed to get translation from DynamoDB: %w", err)
	}
	
	if result.Item == nil {
		return "", fmt.Errorf("translation not found for word_id: %s, language: %s", wordID, targetLanguage)
	}
	
	var translation TranslationItem
	err = attributevalue.UnmarshalMap(result.Item, &translation)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal translation: %w", err)
	}
	
	return translation.Translation, nil
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
