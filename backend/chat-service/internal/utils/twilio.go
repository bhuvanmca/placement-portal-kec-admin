package utils

import (
	"fmt"
	"os"

	"github.com/twilio/twilio-go"
	openapi "github.com/twilio/twilio-go/rest/api/v2010"
)

func SendWhatsAppMessage(to, body string) error {
	client := twilio.NewRestClient()

	from := os.Getenv("TWILIO_WHATSAPP_FROM") // e.g., "whatsapp:+14155238886"
	toAddr := "whatsapp:" + to

	params := &openapi.CreateMessageParams{}
	params.SetFrom(from)
	params.SetTo(toAddr)
	params.SetBody(body)

	_, err := client.Api.CreateMessage(params)
	if err != nil {
		return fmt.Errorf("failed to send whatsapp message: %w", err)
	}

	return nil
}
