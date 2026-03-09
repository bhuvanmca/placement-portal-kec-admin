package handlers

import (
	"fmt"
	"log" // Added for http.StatusInternalServerError
	"strconv"

	"github.com/SysSyncer/placement-portal-kec/internal/models"
	"github.com/SysSyncer/placement-portal-kec/internal/repository"
	"github.com/gofiber/fiber/v2"
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

	case "reject":
		req, err := h.Repo.GetRequestByID(id)
		if err == nil {
			log.Printf("Request REJECTED for Student %d", req.StudentID)
		}

		if err := h.Repo.UpdateRequestStatus(id, "rejected", adminID, &input.RejectionReason); err != nil {
			if len(err.Error()) > 8 && err.Error()[:8] == "CONFLICT" {
				return c.Status(409).JSON(fiber.Map{"error": err.Error(), "code": "CONFLICT"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}

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
