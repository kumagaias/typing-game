# DynamoDB Table for Scores
resource "aws_dynamodb_table" "scores" {
  name           = "${var.project_name}-scores-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "player_name"
  range_key      = "timestamp"

  attribute {
    name = "player_name"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "score"
    type = "N"
  }

  # Global Secondary Index for leaderboard (sorted by score)
  global_secondary_index {
    name     = "ScoreIndex"
    hash_key = "score_type"
    range_key = "score"
    projection_type = "ALL"
  }

  attribute {
    name = "score_type"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-scores-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# DynamoDB Table for Leaderboard
resource "aws_dynamodb_table" "leaderboard" {
  name           = "${var.project_name}-leaderboard-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "player_name"

  attribute {
    name = "player_name"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-leaderboard-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# DynamoDB Table for Words
resource "aws_dynamodb_table" "words" {
  name           = "${var.project_name}-words-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "category"
  range_key      = "word_id"

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "word_id"
    type = "S"
  }

  attribute {
    name = "round"
    type = "N"
  }

  # Global Secondary Index for round-based queries
  global_secondary_index {
    name     = "RoundIndex"
    hash_key = "round"
    range_key = "word_id"
    projection_type = "ALL"
  }

  tags = {
    Name        = "${var.project_name}-words-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}