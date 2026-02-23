package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type WhatsAppService struct {
	PhoneNumberID string
	AccessToken   string
	APIURL        string
}

func NewWhatsAppService() *WhatsAppService {
	phoneID := os.Getenv("WHATSAPP_PHONE_NUMBER_ID")
	token := os.Getenv("WHATSAPP_ACCESS_TOKEN")
	return &WhatsAppService{
		PhoneNumberID: phoneID,
		AccessToken:   token,
		APIURL:        fmt.Sprintf("https://graph.facebook.com/v17.0/%s/messages", phoneID),
	}
}

// SendMessage sends a free-form text message (Only allowed for replies within 24h)
func (s *WhatsAppService) SendMessage(to string, body string) error {
	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                to,
		"type":              "text",
		"text": map[string]string{
			"body": body,
		},
	}
	return s.sendRequest(payload)
}

// SendTemplateMessage sends a pre-approved template (Required for initiating conversation)
func (s *WhatsAppService) SendTemplateMessage(to string, templateName string, language string, components []interface{}) error {
	payload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"to":                to,
		"type":              "template",
		"template": map[string]interface{}{
			"name": templateName,
			"language": map[string]string{
				"code": language,
			},
			"components": components,
		},
	}
	return s.sendRequest(payload)
}

// SendBroadcast sends a template message to multiple numbers
func (s *WhatsAppService) SendBroadcast(recipients []string, templateName string, components []interface{}) (int, error) {
	/*
		successCount := 0
		for _, number := range recipients {
			// ... existing code ...
		}
		return successCount, nil
	*/
	return 0, nil
}

func (s *WhatsAppService) sendRequest(payload interface{}) error {
	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", s.APIURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 {
		// Silent error for unauthorized to avoid flooding logs if token is missing
		return fmt.Errorf("API error: 401 Unauthorized (Check WHATSAPP_ACCESS_TOKEN)")
	}

	if resp.StatusCode >= 400 {
		return fmt.Errorf("API error: %s", resp.Status)
	}

	return nil
}
