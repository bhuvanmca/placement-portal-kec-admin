package utils

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

// UploadToCloudinary uploads a file and returns the secure URL
// UploadToCloudinary uploads a file using Register Number for the path
func UploadToCloudinary(fileHeader *multipart.FileHeader, registerNumber string, docType string) (string, error) {
	cld, err := cloudinary.NewFromURL(os.Getenv("CLOUDINARY_URL"))
	if err != nil {
		return "", fmt.Errorf("failed to init cloudinary: %w", err)
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	// NEW PATH FORMAT: "placement_app/24MCR029/resume"
	publicID := fmt.Sprintf("placement_app/%s/%s", registerNumber, docType)

	uploadResult, err := cld.Upload.Upload(context.Background(), file, uploader.UploadParams{
		PublicID:     publicID,
		ResourceType: "auto",
		Folder:       "placement_portal",
		Overwrite:    api.Bool(true),
	})

	if err != nil {
		return "", fmt.Errorf("cloudinary upload failed: %w", err)
	}

	return uploadResult.SecureURL, nil
}
