package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/repository"
	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/utils"
	"github.com/gofiber/fiber/v2"
)

type ChatHandler struct {
	Repo *repository.ChatRepository
}

func NewChatHandler(repo *repository.ChatRepository) *ChatHandler {
	return &ChatHandler{Repo: repo}
}

// GetGroups retrieves all groups for the authenticated user
// GetGroups retrieves all groups for the authenticated user
func (h *ChatHandler) GetGroups(c *fiber.Ctx) error {
	userID := utils.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: User ID not found"})
	}

	groups, err := h.Repo.GetGroupsByUser(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(groups)
}

// GetPotentialUsers retrieves users available for new groups (Admins/Coordinators)
func (h *ChatHandler) GetPotentialUsers(c *fiber.Ctx) error {
	userID := utils.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: User ID not found"})
	}

	users, err := h.Repo.GetPotentialUsers(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(users)
}

// CreateGroup creates a new group or DM
func (h *ChatHandler) CreateGroup(c *fiber.Ctx) error {
	var req struct {
		Name      string  `json:"name"`
		Type      string  `json:"type"` // "group" or "direct"
		MemberIDs []int64 `json:"member_ids"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	userID := utils.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: User ID not found"})
	}

	// Check for existing DM
	if req.Type == "direct" && len(req.MemberIDs) == 1 {
		otherUserID := req.MemberIDs[0]
		if existingID, _ := h.Repo.FindDirectMessageGroup(c.Context(), userID, otherUserID); existingID != nil {
			return c.Status(fiber.StatusOK).JSON(fiber.Map{"id": *existingID, "message": "Group already exists"})
		}
	}

	groupID, err := h.Repo.CreateGroupWithMembers(c.Context(), req.Name, req.Type, userID, req.MemberIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	response := fiber.Map{
		"id":         groupID,
		"name":       req.Name,
		"type":       req.Type,
		"created_by": userID,
		"message":    "Group created",
	}

	if req.Type == "direct" && len(req.MemberIDs) > 0 {
		response["other_user_id"] = req.MemberIDs[0]
		// For DM, we might want to return the other user's profile photo too if possible,
		// but the frontend receives name from req.Name (which is set to other user's name).
		// ChatArea uses selectedUser.profile_photo_url if available.
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// GetHistory retrieves chat history for a group
func (h *ChatHandler) GetHistory(c *fiber.Ctx) error {
	groupID, _ := strconv.ParseInt(c.Params("groupId"), 10, 64)
	daysStr := c.Query("days", "30") // Default to 30 days
	days, err := strconv.Atoi(daysStr)
	if err != nil {
		days = 30
	}

	userID := utils.GetUserID(c)
	if userID != 0 {
		h.Repo.MarkMessagesRead(c.Context(), groupID, userID)
	}

	cutoff := time.Now().AddDate(0, 0, -days)
	messages, hasOlder, err := h.Repo.GetMessages(c.Context(), groupID, cutoff, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"messages":   messages,
		"has_older":  hasOlder,
		"start_date": cutoff,
	})
}

// PinMessage toggles pin status
func (h *ChatHandler) PinMessage(c *fiber.Ctx) error {
	msgID, _ := strconv.ParseInt(c.Params("msgId"), 10, 64)
	isPinned, err := h.Repo.PinMessage(c.Context(), msgID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	// TODO: Broadcast pin update via WS
	return c.JSON(fiber.Map{"is_pinned": isPinned})
}

// DeleteMessage deletes a message
func (h *ChatHandler) DeleteMessage(c *fiber.Ctx) error {
	msgID, _ := strconv.ParseInt(c.Params("msgId"), 10, 64)
	userID := utils.GetUserID(c)

	deleteForEveryone := c.Query("delete_for_everyone") == "true"

	// For "delete for everyone", also delete the file from S3 if applicable
	if deleteForEveryone {
		msg, err := h.Repo.GetMessageByID(c.Context(), msgID)
		if err != nil {
			fmt.Printf("Error fetching message for delete: %v\n", err)
			return c.Status(500).JSON(fiber.Map{"error": "Message not found"})
		}

		// Verify sender
		if msg.SenderID != userID {
			return c.Status(403).JSON(fiber.Map{"error": "Not authorized to delete this message"})
		}

		// Delete S3 object if it's a file or image
		if (msg.Type == "file" || msg.Type == "image") && msg.Content != "" {
			key, err := utils.ExtractS3KeyFromURL(msg.Content)
			if err == nil && key != "" {
				bucket := utils.GetChatBucket()
				if delErr := utils.DeleteS3Object(c.Context(), bucket, key); delErr != nil {
					// Log but don't fail the delete — the DB record should still be cleaned
					fmt.Printf("Warning: Failed to delete S3 object (bucket=%s, key=%s): %v\n", bucket, key, delErr)
				}
			}
		}
	}

	err := h.Repo.DeleteMessage(c.Context(), msgID, userID, deleteForEveryone)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}
