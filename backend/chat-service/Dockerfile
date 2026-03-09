FROM golang:1.25-alpine AS builder

WORKDIR /app

# Enable Go toolchain auto-download
ENV GOTOOLCHAIN=auto
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=off

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o chat-service ./cmd/api/main.go

# Final Stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Copy binary from builder
COPY --from=builder /app/chat-service .

# Expose port
EXPOSE 8081

# Command to run
CMD ["./chat-service"]
