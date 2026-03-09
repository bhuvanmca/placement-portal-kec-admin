FROM golang:1.25-alpine

WORKDIR /app

# Copy the go mod and sum files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Ensure go.mod is tidy (handles version inconsistencies)
RUN go mod tidy

# Build the binary
RUN go build -o main ./cmd/api

# The API runs on 8084 inside the container
EXPOSE 8084

CMD ["/app/main"]
