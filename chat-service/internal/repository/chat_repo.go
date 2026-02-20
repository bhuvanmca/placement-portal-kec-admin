package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/utils"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ChatRepository struct {
	DB *pgxpool.Pool
}

func NewChatRepository(db *pgxpool.Pool) *ChatRepository {
	return &ChatRepository{DB: db}
}

type ChatGroup struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	CreatedBy int64     `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
}

type ChatMessage struct {
	ID          int64     `json:"id"`
	GroupID     int64     `json:"group_id"`
	SenderID    int64     `json:"sender_id"`
	Content     string    `json:"content"`
	Type        string    `json:"type"`
	Status      string    `json:"status"` // sent, delivered, seen
	CreatedAt   time.Time `json:"created_at"`
	SenderName  string    `json:"sender_name"`
	SenderImage *string   `json:"sender_image,omitempty"`
	SenderRole  *string   `json:"sender_role,omitempty"`
	Metadata    any       `json:"metadata,omitempty"`
	ReplyToID   *int64    `json:"reply_to_id"` // [NEW]
	IsPinned    bool      `json:"is_pinned"`   // [NEW]
	DeletedFor  []int64   `json:"deleted_for"` // [NEW] JSONB array of user IDs
	Forwarded   bool      `json:"forwarded"`   // [NEW]
}

// Migrate ensures the database schema is up to date
func (r *ChatRepository) Migrate(ctx context.Context) error {
	queries := []string{
		`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id BIGINT REFERENCES chat_messages(id)`,
		`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_for JSONB DEFAULT '[]'::jsonb`,
		`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS forwarded BOOLEAN DEFAULT FALSE`,
	}

	for _, query := range queries {
		_, err := r.DB.Exec(ctx, query)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *ChatRepository) CreateGroup(ctx context.Context, name string, groupType string, createdBy int64) (*ChatGroup, error) {
	// ... (no change)
	var group ChatGroup
	query := `
		INSERT INTO chat_groups (name, type, created_by)
		VALUES ($1, $2, $3)
		RETURNING id, name, type, created_by, created_at
	`
	err := r.DB.QueryRow(ctx, query, name, groupType, createdBy).Scan(
		&group.ID, &group.Name, &group.Type, &group.CreatedBy, &group.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &group, nil
}

func (r *ChatRepository) FindDirectMessageGroup(ctx context.Context, user1, user2 int64) (*int64, error) {
	// ... (no change)
	query := `
		SELECT g.id
		FROM chat_groups g
		JOIN chat_group_members m1 ON g.id = m1.group_id
		JOIN chat_group_members m2 ON g.id = m2.group_id
		WHERE g.type = 'direct'
		AND m1.user_id = $1 AND m2.user_id = $2
		LIMIT 1
	`
	var groupID int64
	err := r.DB.QueryRow(ctx, query, user1, user2).Scan(&groupID)
	if err != nil {
		return nil, nil // Not found is not an error for us here
	}
	return &groupID, nil
}

func (r *ChatRepository) GetMessages(ctx context.Context, groupID int64, since time.Time, userID int64) ([]ChatMessage, bool, error) {
	// Updated query to include metadata and time filter
	query := `
		SELECT 
			m.id, m.group_id, m.sender_id, m.content, m.type, m.status, m.created_at,
			u.name as sender_name, u.profile_photo_url as sender_image, u.role as sender_role,
			m.reply_to_id, m.is_pinned, m.forwarded, m.metadata
		FROM chat_messages m
		LEFT JOIN users u ON m.sender_id = u.id
		WHERE m.group_id = $1
		AND m.created_at >= $3
		AND (m.deleted_for IS NULL OR NOT (m.deleted_for @> jsonb_build_array($2::bigint)))
		ORDER BY m.created_at ASC
	`

	rows, err := r.DB.Query(ctx, query, groupID, userID, since)
	if err != nil {
		fmt.Printf("GetMessages Query Error: %v\n", err)
		return nil, false, err
	}
	defer rows.Close()

	var messages []ChatMessage
	for rows.Next() {
		var msg ChatMessage
		var metadataJSON []byte // Temp for scanning

		err := rows.Scan(
			&msg.ID, &msg.GroupID, &msg.SenderID, &msg.Content, &msg.Type, &msg.Status, &msg.CreatedAt,
			&msg.SenderName, &msg.SenderImage, &msg.SenderRole,
			&msg.ReplyToID, &msg.IsPinned, &msg.Forwarded, &metadataJSON,
		)
		if err != nil {
			fmt.Printf("GetMessages Scan Error: %v\n", err)
			return nil, false, err
		}

		// Sign profile photo URL
		if msg.SenderImage != nil && *msg.SenderImage != "" {
			signed := utils.GenerateSignedProfileURL(*msg.SenderImage)
			msg.SenderImage = &signed
		}

		// Parse metadata if present
		if len(metadataJSON) > 0 {
			_ = json.Unmarshal(metadataJSON, &msg.Metadata)
		}

		messages = append(messages, msg)
	}
	if err := rows.Err(); err != nil {
		return nil, false, err
	}

	// Check if there are older messages
	var hasOlder bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM chat_messages WHERE group_id = $1 AND created_at < $2)`
	err = r.DB.QueryRow(ctx, checkQuery, groupID, since).Scan(&hasOlder)
	if err != nil {
		fmt.Printf("CheckOlder Query Error: %v\n", err)
		// Don't fail the request, just assume false or log
		hasOlder = false
	}

	return messages, hasOlder, nil
}

func (r *ChatRepository) SaveMessage(ctx context.Context, groupID, senderID int64, content, msgType string, metadata any, replyToID *int64, forwarded bool) (*ChatMessage, error) {
	// metadata can be map[string]interface{} or nil
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		// If marshalling fails, just use empty JSON object
		metadataJSON = []byte("{}")
	}

	query := `
		INSERT INTO chat_messages (group_id, sender_id, content, type, status, metadata, reply_to_id, forwarded)
		VALUES ($1, $2, $3, $4, 'sent', $5, $6, $7)
		RETURNING id, created_at, status
	`
	var msg ChatMessage
	msg.GroupID = groupID
	msg.SenderID = senderID
	msg.Content = content
	msg.Type = msgType
	msg.ReplyToID = replyToID
	msg.Forwarded = forwarded
	// We need to unmarshal later if we want it in struct, but for now we just return what we passed
	msg.Metadata = metadata

	err = r.DB.QueryRow(ctx, query, groupID, senderID, content, msgType, metadataJSON, replyToID, forwarded).Scan(&msg.ID, &msg.CreatedAt, &msg.Status)
	if err != nil {
		return nil, err
	}

	// Fetch sender details to return full object for broadcast
	userQuery := `SELECT name, profile_photo_url, role FROM users WHERE id = $1`
	err = r.DB.QueryRow(ctx, userQuery, senderID).Scan(&msg.SenderName, &msg.SenderImage, &msg.SenderRole)
	if err != nil {
		return nil, err
	}

	// Sign profile photo URL
	if msg.SenderImage != nil && *msg.SenderImage != "" {
		signed := utils.GenerateSignedProfileURL(*msg.SenderImage)
		msg.SenderImage = &signed
	}

	return &msg, nil
}

// PinMessage toggles the pinned status of a message
func (r *ChatRepository) PinMessage(ctx context.Context, msgID int64) (bool, error) {
	query := `
		UPDATE chat_messages 
		SET is_pinned = NOT is_pinned 
		WHERE id = $1 
		RETURNING is_pinned
	`
	var isPinned bool
	err := r.DB.QueryRow(ctx, query, msgID).Scan(&isPinned)
	return isPinned, err
}

// MessageInfo holds basic info about a message for delete cleanup
type MessageInfo struct {
	ID       int64  `json:"id"`
	SenderID int64  `json:"sender_id"`
	Content  string `json:"content"`
	Type     string `json:"type"`
	IsPinned bool   `json:"is_pinned"`
}

// GetMessageByID fetches basic message info for delete cleanup
func (r *ChatRepository) GetMessageByID(ctx context.Context, msgID int64) (*MessageInfo, error) {
	query := `SELECT id, sender_id, COALESCE(content, ''), COALESCE(type, 'text'), COALESCE(is_pinned, false) FROM chat_messages WHERE id = $1`
	var msg MessageInfo
	err := r.DB.QueryRow(ctx, query, msgID).Scan(&msg.ID, &msg.SenderID, &msg.Content, &msg.Type, &msg.IsPinned)
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

// DeleteMessage performs soft delete (for everyone or for user)
func (r *ChatRepository) DeleteMessage(ctx context.Context, msgID, userID int64, forEveryone bool) error {
	if forEveryone {
		// Mark as deleted, clear content, metadata, and unpin
		query := `UPDATE chat_messages SET type = 'deleted', content = '', metadata = '{}'::jsonb, is_pinned = false WHERE id = $1 AND sender_id = $2`
		_, err := r.DB.Exec(ctx, query, msgID, userID)
		return err
	} else {
		// Add userID to deleted_for array
		query := `
			UPDATE chat_messages 
			SET deleted_for = deleted_for || to_jsonb($2::bigint) 
			WHERE id = $1 AND NOT (deleted_for @> to_jsonb($2::bigint))
		`
		_, err := r.DB.Exec(ctx, query, msgID, userID)
		return err
	}
}

func (r *ChatRepository) UpdateMessagesStatus(ctx context.Context, groupID, readerID int64, status string) error {
	// Update all messages in the group NOT sent by readerID to 'status'
	query := `
		UPDATE chat_messages
		SET status = $1
		WHERE group_id = $2 AND sender_id != $3 AND status != $1
	`
	_, err := r.DB.Exec(ctx, query, status, groupID, readerID)
	return err
}

func (r *ChatRepository) GetGroupsByUser(ctx context.Context, userID int64) ([]map[string]interface{}, error) {
	// 1. Get Groups (Direct & Group) with efficient Last Message fetch
	query := `
        SELECT 
            g.id, g.name, g.type, 
            lm.content as last_message,
            lm.type as last_message_type,
            lm.metadata as last_message_metadata,
            lm.created_at as last_message_time,
            COUNT(CASE WHEN m.created_at > mem.last_read_at AND m.sender_id != $1 THEN 1 END) as unread_count
        FROM chat_groups g
        JOIN chat_group_members mem ON g.id = mem.group_id
        LEFT JOIN chat_messages m ON g.id = m.group_id
        LEFT JOIN LATERAL (
            SELECT content, type, metadata, created_at
            FROM chat_messages
            WHERE group_id = g.id
            ORDER BY created_at DESC
            LIMIT 1
        ) lm ON true
        WHERE mem.user_id = $1
        GROUP BY g.id, g.name, g.type, lm.content, lm.type, lm.metadata, lm.created_at
        ORDER BY lm.created_at DESC NULLS LAST
    `
	rows, err := r.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []map[string]interface{}
	for rows.Next() {
		var id int64
		var name, groupType string
		var lastMessage *string
		var lastMessageType *string
		var lastMessageMetadata []byte
		var lastMessageTime *time.Time
		var unreadCount int

		if err := rows.Scan(&id, &name, &groupType, &lastMessage, &lastMessageType, &lastMessageMetadata, &lastMessageTime, &unreadCount); err != nil {
			return nil, err
		}

		group := map[string]interface{}{
			"id":                id,
			"name":              name,
			"type":              groupType,
			"last_message":      lastMessage,
			"last_message_type": lastMessageType,
			// "last_message_metadata": parsed below
			"last_message_at": lastMessageTime,
			"unread_count":    unreadCount,
		}

		if len(lastMessageMetadata) > 0 {
			var meta map[string]interface{}
			if err := json.Unmarshal(lastMessageMetadata, &meta); err == nil {
				group["last_message_metadata"] = meta
			}
		}

		// If Direct Message, get the other user's name and photo
		if groupType == "direct" {
			otherUserQuery := `
                SELECT u.id, u.name, u.profile_photo_url, u.role, u.department_code, u.last_seen
                FROM chat_group_members cgm
                JOIN users u ON cgm.user_id = u.id
                WHERE cgm.group_id = $1 AND cgm.user_id != $2
                LIMIT 1
            `
			var otherID int64
			var otherName string
			var otherPhoto, otherBranch *string
			var otherRole string
			var lastSeen *time.Time

			err := r.DB.QueryRow(ctx, otherUserQuery, id, userID).Scan(&otherID, &otherName, &otherPhoto, &otherRole, &otherBranch, &lastSeen)
			if err == nil {
				group["name"] = otherName
				group["image"] = otherPhoto
				group["role"] = otherRole
				group["branch"] = otherBranch
				group["other_user_id"] = otherID
				group["last_seen"] = lastSeen
			}
		}

		groups = append(groups, group)
	}
	return groups, nil
}

func (r *ChatRepository) GetPotentialUsers(ctx context.Context, currentUserID int64) ([]map[string]interface{}, error) {
	query := `
        SELECT id, name, email, role, profile_photo_url, department_code 
        FROM users 
        WHERE role IN ('admin', 'coordinator') AND id != $1 AND is_active = TRUE
    `
	rows, err := r.DB.Query(ctx, query, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id int64
		var name, email, role string
		var photo, branch *string
		if err := rows.Scan(&id, &name, &email, &role, &photo, &branch); err != nil {
			return nil, err
		}
		// Sign profile photo URL
		var signedPhoto *string
		if photo != nil && *photo != "" {
			s := utils.GenerateSignedProfileURL(*photo)
			signedPhoto = &s
		} else {
			signedPhoto = photo
		}

		users = append(users, map[string]interface{}{
			"id":                id,
			"name":              name,
			"email":             email,
			"role":              role,
			"profile_photo_url": signedPhoto,
			"branch":            branch,
		})
	}
	return users, nil
}

func (r *ChatRepository) CreateGroupWithMembers(ctx context.Context, name, groupType string, createdBy int64, memberIDs []int64) (int64, error) {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	var groupID int64
	err = tx.QueryRow(ctx, "INSERT INTO chat_groups (name, type, created_by) VALUES ($1, $2, $3) RETURNING id", name, groupType, createdBy).Scan(&groupID)
	if err != nil {
		return 0, err
	}

	// Add members
	for _, memberID := range memberIDs {
		_, err := tx.Exec(ctx, "INSERT INTO chat_group_members (group_id, user_id, role) VALUES ($1, $2, 'member')", groupID, memberID)
		if err != nil {
			return 0, err
		}
	}

	// Add creator as admin
	_, err = tx.Exec(ctx, "INSERT INTO chat_group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')", groupID, createdBy)
	if err != nil {
		return 0, err
	}

	return groupID, tx.Commit(ctx)
}

func (r *ChatRepository) MarkMessagesRead(ctx context.Context, groupID, userID int64) error {
	_, err := r.DB.Exec(ctx, "UPDATE chat_group_members SET last_read_at = NOW() WHERE group_id = $1 AND user_id = $2", groupID, userID)
	return err
}

func (r *ChatRepository) GetUserSimple(ctx context.Context, userID int64) (string, error) {
	var name string
	query := `SELECT name FROM users WHERE id = $1`
	err := r.DB.QueryRow(ctx, query, userID).Scan(&name)
	if err != nil {
		return "", err
	}
	return name, nil
}
