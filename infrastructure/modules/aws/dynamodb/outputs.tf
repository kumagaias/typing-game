output "scores_table_name" {
  description = "Name of the scores DynamoDB table"
  value       = aws_dynamodb_table.scores.name
}

output "scores_table_arn" {
  description = "ARN of the scores DynamoDB table"
  value       = aws_dynamodb_table.scores.arn
}

output "leaderboard_table_name" {
  description = "Name of the leaderboard DynamoDB table"
  value       = aws_dynamodb_table.leaderboard.name
}

output "leaderboard_table_arn" {
  description = "ARN of the leaderboard DynamoDB table"
  value       = aws_dynamodb_table.leaderboard.arn
}

output "words_table_name" {
  description = "Name of the words DynamoDB table"
  value       = aws_dynamodb_table.words.name
}

output "words_table_arn" {
  description = "ARN of the words DynamoDB table"
  value       = aws_dynamodb_table.words.arn
}