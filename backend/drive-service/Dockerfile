FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o drive-service ./cmd/api

FROM alpine:3.21

WORKDIR /app
RUN apk add --no-cache ca-certificates curl

COPY --from=builder /app/drive-service .

EXPOSE 8083

CMD ["./drive-service"]
