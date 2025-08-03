# Production Environment Configuration
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket  = "typing-game-tf-state"
    key     = "production.tfstate"
    region  = "ap-northeast-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Name        = "typing-game"
      Environment = "production"
      Project     = "typing-game"
      ManagedBy   = "terraform"
    }
  }
}

# ECR Module
module "ecr" {
  source = "../../modules/aws/ecr"
  
  environment = "production"
  project_name = var.project_name
}

# DynamoDB Module
module "dynamodb" {
  source = "../../modules/aws/dynamodb"
  
  environment = "production"
  project_name = var.project_name
}

# Lambda Module
module "lambda" {
  source = "../../modules/aws/lambda"
  
  environment = "production"
  project_name = var.project_name
  
  ecr_repository_url = module.ecr.repository_url
  scores_table_name = module.dynamodb.scores_table_name
  scores_table_arn = module.dynamodb.scores_table_arn
  leaderboard_table_name = module.dynamodb.leaderboard_table_name
  leaderboard_table_arn = module.dynamodb.leaderboard_table_arn
  words_table_name = module.dynamodb.words_table_name
  words_table_arn = module.dynamodb.words_table_arn
}

# API Gateway Module
module "api_gateway" {
  source = "../../modules/aws/api-gateway"
  
  environment = "production"
  project_name = var.project_name
  
  lambda_function_name = module.lambda.lambda_function_name
  lambda_invoke_arn = module.lambda.lambda_invoke_arn
}

# GitHub Actions IAM Module
module "github_actions_iam" {
  source = "../../modules/aws/github-actions-iam"
  
  environment = "production"
  project_name = var.project_name
  github_repository = var.github_repository
}
