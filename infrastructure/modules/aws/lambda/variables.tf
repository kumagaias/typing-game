variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (production)"
  type        = string
  validation {
    condition     = contains(["production"], var.environment)
    error_message = "Environment must be 'production'."
  }
}

variable "ecr_repository_url" {
  description = "ECR repository URL for Lambda container image"
  type        = string
}

variable "scores_table_name" {
  description = "Name of the scores DynamoDB table"
  type        = string
}

variable "scores_table_arn" {
  description = "ARN of the scores DynamoDB table"
  type        = string
}

variable "leaderboard_table_name" {
  description = "Name of the leaderboard DynamoDB table"
  type        = string
}

variable "leaderboard_table_arn" {
  description = "ARN of the leaderboard DynamoDB table"
  type        = string
}

variable "words_table_name" {
  description = "Name of the words DynamoDB table"
  type        = string
}

variable "words_table_arn" {
  description = "ARN of the words DynamoDB table"
  type        = string
}