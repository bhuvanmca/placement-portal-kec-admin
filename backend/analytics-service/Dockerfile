FROM golang:1.25-alpine

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go mod tidy

RUN go build -o main ./cmd/api

EXPOSE 8086

CMD ["/app/main"]
