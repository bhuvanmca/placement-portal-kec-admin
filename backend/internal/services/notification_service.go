package services

import (
	"context"
	"fmt"
	"log"

	firebase "firebase.google.com/go"
	"firebase.google.com/go/messaging"
	"google.golang.org/api/option"
)

type NotificationService struct {
	Client *messaging.Client
}

// NewNotificationService initializes the Firebase Messaging Client
func NewNotificationService(credentialsFile string) (*NotificationService, error) {
	// If file doesn't exist, we might want to return a dummy service or error
	// For now, let's assume valid setup or graceful degradation
	opt := option.WithCredentialsFile(credentialsFile)
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		return nil, fmt.Errorf("error initializing firebase app: %v", err)
	}

	client, err := app.Messaging(context.Background())
	if err != nil {
		return nil, fmt.Errorf("error getting messaging client: %v", err)
	}

	return &NotificationService{Client: client}, nil
}

// SendMulticastNotification sends a message to multiple devices
// tokens: List of FCM tokens
// title: Notification Title
// body: Notification Body
// data: Custom data payload (optional)
func (s *NotificationService) SendMulticastNotification(ctx context.Context, tokens []string, title, body string, data map[string]string) (int, error) {
	if s.Client == nil {
		log.Println("NotificationService: Client is nil, skipping notification")
		return 0, nil
	}

	if len(tokens) == 0 {
		return 0, nil
	}

	// FCM Multicast handles up to 500 tokens at once.
	// Basic implementation:
	message := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
	}

	br, err := s.Client.SendMulticast(ctx, message)
	if err != nil {
		return 0, err
	}

	if br.FailureCount > 0 {
		log.Printf("CreateDrive: %d messages failed to send.\n", br.FailureCount)
	}

	return br.SuccessCount, nil
}
