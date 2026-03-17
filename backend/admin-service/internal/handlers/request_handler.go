package handlers

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/placement-portal-kec/admin-service/internal/database"
	"github.com/placement-portal-kec/admin-service/internal/models"
	"github.com/placement-portal-kec/admin-service/internal/repository"
	"github.com/placement-portal-kec/admin-service/internal/services"
	"github.com/placement-portal-kec/admin-service/internal/utils"
)

type RequestHandler struct {
	Repo        *repository.RequestRepository
	StudentRepo *repository.StudentRepository
}

func NewRequestHandler(repo *repository.RequestRepository, studentRepo *repository.StudentRepository) *RequestHandler {
	return &RequestHandler{Repo: repo, StudentRepo: studentRepo}
}

// CreateRequest handles students requesting a mark update
func (h *RequestHandler) CreateRequest(c *fiber.Ctx) error {
	var input struct {
		FieldName string  `json:"field_name"`
		NewValue  float64 `json:"new_value"`
		Reason    string  `json:"reason"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	// Get student ID from context
	userID := int64(c.Locals("user_id").(float64))

	// Get current student data to find old value
	// Using FullProfile as it has the data we need
	student, err := h.StudentRepo.GetStudentFullProfile(c.Context(), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Student not found"})
	}

	var oldValue float64
	switch input.FieldName {
	case "ug_cgpa":
		oldValue = student.UgCgpa
	case "pg_cgpa":
		oldValue = student.PgCgpa
	default:
		oldValue = 0.0
	}

	req := models.StudentChangeRequest{
		StudentID: userID,
		FieldName: input.FieldName,
		OldValue:  fmt.Sprintf("%.2f", oldValue),
		NewValue:  fmt.Sprintf("%.2f", input.NewValue),
		Reason:    input.Reason,
		Status:    "pending",
	}

	if err := h.Repo.CreateRequest(&req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
	}

	return c.Status(201).JSON(fiber.Map{"message": "Request submitted successfully"})
}

func (h *RequestHandler) GetPendingRequests(c *fiber.Ctx) error {
	reqs, err := h.Repo.GetPendingRequests()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch requests"})
	}
	return c.JSON(reqs)
}

func (h *RequestHandler) ReviewRequest(c *fiber.Ctx) error {
	id, _ := strconv.ParseInt(c.Params("id"), 10, 64)
	var input struct {
		Action          string `json:"action"` // approve, reject
		RejectionReason string `json:"rejection_reason"`
	}

	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid input"})
	}

	adminID := int64(c.Locals("user_id").(float64))

	// Helper to format field names for display (e.g., "tenth_mark" → "Tenth Mark")
	formatFieldName := func(field string) string {
		words := strings.Split(strings.ReplaceAll(field, "_", " "), " ")
		for i, w := range words {
			if len(w) > 0 {
				words[i] = strings.ToUpper(w[:1]) + w[1:]
			}
		}
		return strings.Join(words, " ")
	}

	// Helper to send status email (non-blocking, logs errors)
	sendStatusEmail := func(req *models.StudentChangeRequest, status, adminComment string) {
		go func() {
			userRepo := repository.NewUserRepository(database.DB)
			user, err := userRepo.GetUserByID(context.Background(), req.StudentID)
			if err != nil {
				log.Printf("WARNING: Could not fetch student %d email for request notification: %v", req.StudentID, err)
				return
			}
			studentName := ""
			if user.Name != nil {
				studentName = *user.Name
			}
			fieldLabel := formatFieldName(req.FieldName)
			if err := utils.SendRequestStatusEmail(user.Email, studentName, fieldLabel, req.OldValue, req.NewValue, status, adminComment); err != nil {
				log.Printf("WARNING: Failed to send %s email for request %d to %s: %v", status, req.ID, user.Email, err)
			} else {
				log.Printf("Sent %s notification email for request %d to %s", status, req.ID, user.Email)
			}
		}()
	}

	switch input.Action {
	case "approve":
		req, err := h.Repo.GetRequestByID(id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}

		// 1. Attempt to set status to APPROVED (Atomic Check)
		if err := h.Repo.UpdateRequestStatus(id, "approved", adminID, nil); err != nil {
			if len(err.Error()) > 8 && err.Error()[:8] == "CONFLICT" {
				return c.Status(409).JSON(fiber.Map{"error": err.Error(), "code": "CONFLICT"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}

		// 2. Apply the change to student profile
		err = h.StudentRepo.ApplyFieldUpdate(req.StudentID, req.FieldName, req.NewValue)
		if err != nil {
			log.Printf("CRITICAL: Request %d approved by %d but ApplyFieldUpdate failed: %v", id, adminID, err)
			return c.Status(500).JSON(fiber.Map{"error": "Request approved but failed to update student record. Please contact super admin."})
		}

		log.Printf("Request APPROVED for Student %d", req.StudentID)

		// 3. Send approval email notification
		sendStatusEmail(req, "approved", "")

		// 4. Send FCM push notification for instant update in student app
		go func() {
			var token string
			_ = database.DB.QueryRow(context.Background(),
				"SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL AND fcm_token != ''",
				req.StudentID).Scan(&token)
			if token == "" {
				return
			}
			ns, err := services.NewNotificationService("firebase-service-account.json")
			if err != nil {
				log.Printf("Failed to init notification service for profile approval: %v", err)
				return
			}
			fieldLabel := formatFieldName(req.FieldName)
			title := "Profile Update Approved! ✅"
			body := fmt.Sprintf("Your request to update %s has been approved. Your profile is now updated.", fieldLabel)
			_, err = ns.SendMulticastNotification(context.Background(), []string{token}, title, body, map[string]string{
				"type": "profile_update",
			})
			if err != nil {
				log.Printf("Failed to send FCM for profile approval to student %d: %v", req.StudentID, err)
			}
		}()

	case "reject":
		req, err := h.Repo.GetRequestByID(id)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}

		log.Printf("Request REJECTED for Student %d", req.StudentID)

		if err := h.Repo.UpdateRequestStatus(id, "rejected", adminID, &input.RejectionReason); err != nil {
			if len(err.Error()) > 8 && err.Error()[:8] == "CONFLICT" {
				return c.Status(409).JSON(fiber.Map{"error": err.Error(), "code": "CONFLICT"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}

		// Send rejection email notification
		sendStatusEmail(req, "rejected", input.RejectionReason)

		// Send FCM push notification for rejection
		go func() {
			var token string
			_ = database.DB.QueryRow(context.Background(),
				"SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL AND fcm_token != ''",
				req.StudentID).Scan(&token)
			if token == "" {
				return
			}
			ns, err := services.NewNotificationService("firebase-service-account.json")
			if err != nil {
				log.Printf("Failed to init notification service for profile rejection: %v", err)
				return
			}
			fieldLabel := formatFieldName(req.FieldName)
			title := "Profile Update Rejected"
			body := fmt.Sprintf("Your request to update %s has been rejected.", fieldLabel)
			if input.RejectionReason != "" {
				body += fmt.Sprintf(" Reason: %s", input.RejectionReason)
			}
			_, err = ns.SendMulticastNotification(context.Background(), []string{token}, title, body, map[string]string{
				"type": "profile_update",
			})
			if err != nil {
				log.Printf("Failed to send FCM for profile rejection to student %d: %v", req.StudentID, err)
			}
		}()

	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid action"})
	}

	return c.JSON(fiber.Map{"message": "Request reviewed successfully"})
}

// GetMyRequests handles GET /api/v1/student/requests
func (h *RequestHandler) GetMyRequests(c *fiber.Ctx) error {
	userID := int64(c.Locals("user_id").(float64))

	requests, err := h.Repo.GetRequestsByStudentID(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch requests"})
	}

	return c.JSON(requests)
}

// DeleteMyRequest handles DELETE /api/v1/student/requests/:id
func (h *RequestHandler) DeleteMyRequest(c *fiber.Ctx) error {
	studentID := int64(c.Locals("user_id").(float64))
	requestID, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request ID"})
	}

	if err := h.Repo.SoftDeleteStudentChangeRequest(c.Context(), studentID, requestID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to remove request or request not found"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Request removed from history"})
}
