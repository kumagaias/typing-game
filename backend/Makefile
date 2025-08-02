.PHONY: build run test clean docker-build docker-run

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=main

# Build the application
build:
	$(GOBUILD) -o $(BINARY_NAME) -v ./...

# Run the application
run:
	$(GOCMD) run main.go

# Test the application
test:
	$(GOTEST) -v ./...

# Clean build files
clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)

# Download dependencies
deps:
	$(GOMOD) download
	$(GOMOD) tidy

# Docker commands
docker-build:
	docker build -t typing-game-backend .

docker-run:
	docker run -p 8080:8080 typing-game-backend

# Lambda build (for deployment)
lambda-build:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 $(GOBUILD) -o bootstrap main.go
	zip lambda-deployment.zip bootstrap

# Development server with hot reload (requires air)
dev:
	air

# Install development tools
install-tools:
	go install github.com/cosmtrek/air@latest