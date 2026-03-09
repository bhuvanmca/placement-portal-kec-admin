FROM golang:1.25-alpine

WORKDIR /app

# Copy the go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN go build -o main ./cmd/api

# Expose port (Drive Service uses 8083)
EXPOSE 8083

# Command to run the executable
CMD ["./main"]
