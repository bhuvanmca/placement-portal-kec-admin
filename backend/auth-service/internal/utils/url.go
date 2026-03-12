package utils

import (
	"fmt"
	"net/url"
	"os"
	"strings"
)

// GenerateSignedProfileURL converts a stored DB URL to a browser-accessible public URL.
func GenerateSignedProfileURL(originalURL string) string {
	if originalURL == "" {
		return ""
	}

	bucket, key := extractBucketAndKey(originalURL)
	if bucket == "" || key == "" {
		return originalURL
	}

	if idx := strings.Index(key, "?"); idx != -1 {
		key = key[:idx]
	}

	publicDomain := os.Getenv("PUBLIC_DOMAIN")
	if publicDomain == "" {
		return originalURL
	}
	publicDomain = strings.TrimRight(publicDomain, "/")

	return fmt.Sprintf("%s/storage/%s/%s", publicDomain, bucket, key)
}

func extractBucketAndKey(rawURL string) (string, string) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", ""
	}

	path := strings.TrimPrefix(parsed.Path, "/")
	path = strings.TrimPrefix(path, "storage/")
	parts := strings.SplitN(path, "/", 2)
	if len(parts) < 2 {
		return "", ""
	}

	return parts[0], parts[1]
}
