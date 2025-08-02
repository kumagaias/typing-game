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