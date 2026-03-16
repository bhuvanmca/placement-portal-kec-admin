FROM golang:1.25-alpine AS builder

WORKDIR /app

ENV GOTOOLCHAIN=auto
ENV GOPROXY=https://proxy.golang.org,direct
ENV GOSUMDB=off

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o chat-service ./cmd/api

FROM alpine:3.21

WORKDIR /app
RUN apk add --no-cache ca-certificates curl

COPY --from=builder /app/chat-service .

EXPOSE 8081

CMD ["./chat-service"]
