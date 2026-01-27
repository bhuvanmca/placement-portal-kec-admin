# Stage 1: Build the Go binary
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Copy dependency files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary named 'server'
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/api/main.go

# Stage 2: Run the binary (Tiny Alpine image)
FROM alpine:latest

WORKDIR /app

# Install certificates for HTTPS calls
RUN apk --no-cache add ca-certificates

# Copy the binary from the builder
COPY --from=builder /app/server .

# Copy assets (Critical for your app)
COPY --from=builder /app/assets ./assets

# Open the port
EXPOSE 8080

# Start the server
CMD ["./server"]