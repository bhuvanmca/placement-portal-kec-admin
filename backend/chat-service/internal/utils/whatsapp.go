package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// WhatsApp Meta Cloud API
// Requires: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages

type whatsappTextBody struct {
	Body string `json:"body"`
}

type whatsappMessage struct {
	MessagingProduct string           `json:"messaging_product"`
	To               string           `json:"to"`
	Type             string           `json:"type"`
	Text             whatsappTextBody `json:"text"`
}

func SendWhatsAppMessage(to, body string) error {
	phoneNumberID := os.Getenv("WHATSAPP_PHONE_NUMBER_ID")
	accessToken := os.Getenv("WHATSAPP_ACCESS_TOKEN")

	if phoneNumberID == "" || accessToken == "" {
		return fmt.Errorf("WhatsApp Cloud API not configured (missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN)")
	}

	url := fmt.Sprintf("https://graph.facebook.com/v21.0/%s/messages", phoneNumberID)

	msg := whatsappMessage{
		MessagingProduct: "whatsapp",
		To:               to,
		Type:             "text",
		Text:             whatsappTextBody{Body: body},
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("failed to marshal whatsapp message: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("failed to create whatsapp request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send whatsapp message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("whatsapp API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}
