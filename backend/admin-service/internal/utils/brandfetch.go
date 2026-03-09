package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// Logo.dev API provides company logos and brand information
// Documentation: https://docs.logo.dev

type BrandInfo struct {
	Name    string `json:"name"`
	Website string `json:"website"`
	LogoURL string `json:"logo_url"`
}

type SearchResponse struct {
	Name   string `json:"name"`
	Domain string `json:"domain"`
	Icon   string `json:"icon"`
}

// Logo.dev Brand Search API response
type LogoDevSearchResponse struct {
	Name    string `json:"name"`
	Domain  string `json:"domain"`
	LogoURL string `json:"logo_url,omitempty"`
}

// FetchCompanyBrand fetches company info using Logo.dev API
func FetchCompanyBrand(domain string) (*BrandInfo, error) {
	apiKey := os.Getenv("LOGO_DEV_SECRET_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("LOGO_DEV_SECRET_KEY not configured")
	}

	// Clean the domain
	cleanDomain := cleanDomain(domain)

	// Logo.dev Logo Images API - get logo by domain
	// Format: https://img.logo.dev/{domain}?token={api_key}
	logoURL := fmt.Sprintf("https://img.logo.dev/%s?token=%s&size=200", cleanDomain, apiKey)

	// Verify the logo exists by making a HEAD request
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Head(logoURL)

	var finalLogoURL string
	if err == nil && resp.StatusCode == http.StatusOK {
		// Logo exists - use the permanent URL
		finalLogoURL = logoURL
	} else {
		// Logo not found - leave empty
		finalLogoURL = ""
	}

	return &BrandInfo{
		Name:    extractCompanyName(cleanDomain),
		Website: cleanDomain,
		LogoURL: finalLogoURL,
	}, nil
}

// SearchCompanies uses Logo.dev Brand Search API
func SearchCompanies(query string) ([]SearchResponse, error) {
	apiKey := os.Getenv("LOGO_DEV_SECRET_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("LOGO_DEV_SECRET_KEY not configured")
	}

	// Logo.dev Brand Search API
	// https://api.logo.dev/search?q={query}
	encodedQuery := url.QueryEscape(query)
	apiURL := fmt.Sprintf("https://api.logo.dev/search?q=%s", encodedQuery)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	// Add Authorization header with Bearer token
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", apiKey))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == 404 {
			return []SearchResponse{}, nil
		}
		return nil, fmt.Errorf("logo.dev API returned %d", resp.StatusCode)
	}

	var logoDevResults []LogoDevSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&logoDevResults); err != nil {
		return nil, err
	}

	// Convert to our SearchResponse format
	var results []SearchResponse
	for _, item := range logoDevResults {
		// Use the logo URL from the API response if available
		// Otherwise generate it manually
		logoURL := item.LogoURL
		if logoURL == "" {
			logoURL = fmt.Sprintf("https://img.logo.dev/%s?token=%s&size=200", item.Domain, apiKey)
		}

		results = append(results, SearchResponse{
			Name:   item.Name,
			Domain: item.Domain,
			Icon:   logoURL,
		})
	}

	return results, nil
}

// cleanDomain removes protocol, www, paths, and query parameters from domain
func cleanDomain(domain string) string {
	// Remove protocol
	domain = strings.TrimPrefix(domain, "http://")
	domain = strings.TrimPrefix(domain, "https://")

	// Remove www.
	domain = strings.TrimPrefix(domain, "www.")

	// Remove path and query
	if idx := strings.Index(domain, "/"); idx != -1 {
		domain = domain[:idx]
	}
	if idx := strings.Index(domain, "?"); idx != -1 {
		domain = domain[:idx]
	}

	return strings.TrimSpace(strings.ToLower(domain))
}

// extractCompanyName extracts a readable company name from domain
// e.g., "google.com" -> "Google"
func extractCompanyName(domain string) string {
	// Remove TLD (.com, .io, etc.)
	parts := strings.Split(domain, ".")
	if len(parts) > 0 {
		name := parts[0]
		// Capitalize first letter
		if len(name) > 0 {
			return strings.ToUpper(name[:1]) + name[1:]
		}
		return name
	}
	return domain
}
