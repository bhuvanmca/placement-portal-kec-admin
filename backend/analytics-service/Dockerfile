FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o analytics-service ./cmd/api

FROM alpine:latest

WORKDIR /app
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/analytics-service .

EXPOSE 8086

CMD ["./analytics-service"]
