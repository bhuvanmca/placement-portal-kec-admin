package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/SysSyncer/placement-portal-kec/chat-service/internal/repository"
	"github.com/gofiber/fiber/v2"
	websocket "github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v5"
)

// Client represents a connected user
type Client struct {
	Hub  *Hub
	Conn *websocket.Conn
	Send chan []byte
	ID   string // User ID
}

// PresenceEvent defines the structure for online/offline events
type PresenceEvent struct {
	Type   string `json:"type"` // "presence"
	UserID string `json:"user_id"`
	Status string `json:"status"` // "online" or "offline"
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	Clients    map[*Client]bool
	UserCounts map[string]int // UserID -> Connection Count
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	Repo       *repository.ChatRepository
}

func NewHub(repo *repository.ChatRepository) *Hub {
	return &Hub{
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[*Client]bool),
		UserCounts: make(map[string]int),
		Repo:       repo,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			h.UserCounts[client.ID]++
			if h.UserCounts[client.ID] == 1 {
				// Broadcast User Online
				h.broadcastPresence(client.ID, "online")
			}

			// Send list of currently online users to the new client
			var onlineUsers []string
			for userID := range h.UserCounts {
				onlineUsers = append(onlineUsers, userID)
			}
			if len(onlineUsers) > 0 {
				syncMsg, _ := json.Marshal(map[string]interface{}{
					"type":  "presence_sync",
					"users": onlineUsers,
				})
				client.Send <- syncMsg
			}

		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
				h.UserCounts[client.ID]--
				if h.UserCounts[client.ID] <= 0 {
					delete(h.UserCounts, client.ID)

					// Update Last Seen in DB
					userIDInt, _ := strconv.ParseInt(client.ID, 10, 64)
					ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
					_, _ = h.Repo.DB.Exec(ctx, "UPDATE users SET last_seen = NOW() WHERE id = $1", userIDInt)
					cancel()

					// Broadcast User Offline
					h.broadcastPresence(client.ID, "offline")
				}
			}
		case message := <-h.Broadcast:
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client)
				}
			}
		}
	}
}

func (h *Hub) broadcastPresence(userID, status string) {
	msg, _ := json.Marshal(PresenceEvent{
		Type:   "presence",
		UserID: userID,
		Status: status,
	})
	for client := range h.Clients {
		select {
		case client.Send <- msg:
		default:
			close(client.Send)
			delete(h.Clients, client)
		}
	}
}

func ServeWs(hub *Hub) fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		// Extract token
		tokenString := c.Query("token")
		log.Println("WS: New connection attempt")
		if tokenString == "" {
			log.Println("WebSocket connection rejected: No token provided")
			c.Close()
			return
		}
		if len(tokenString) > 10 {
			log.Printf("WS: Token received (len=%d): %s...", len(tokenString), tokenString[:10])
		} else {
			log.Printf("WS: Token received (len=%d)", len(tokenString))
		}

		// Validate Token
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			log.Printf("Invalid WebSocket token: %v", err)
			if token != nil {
				log.Printf("Token valid state: %v", token.Valid)
			}
			log.Printf("JWT_SECRET length: %d", len(os.Getenv("JWT_SECRET")))
			c.Close()
			return
		}

		// Extract User ID
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.Close()
			return
		}

		// Adjust this based on your JWT claim structure
		// Assuming "user_id" is float64 (default for JSON numbers)
		var userID string
		if uid, ok := claims["user_id"].(float64); ok {
			userID = fmt.Sprintf("%.0f", uid)
		} else if uidStr, ok := claims["user_id"].(string); ok {
			userID = uidStr
		} else {
			// Fallback or error
			log.Println("WS: No user_id in claims")
			c.Close()
			return
		}

		log.Printf("WS: Auth success for UserID: %s", userID)

		client := &Client{Hub: hub, Conn: c, Send: make(chan []byte, 256), ID: userID}
		client.Hub.Register <- client

		defer func() {
			log.Printf("WS: Connection closing for UserID: %s", userID)
			client.Hub.Unregister <- client
			c.Close()
		}()

		go client.writePump()
		log.Println("WS: Starting readPump")
		client.readPump()
	})
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WS: Read error: %v", err)
			} else {
				log.Printf("WS: Connection closed normally or expected error: %v", err)
			}
			break
		}
		// Parse message to get group_id, content, etc.
		var msgData struct {
			GroupID   int64  `json:"group_id"`
			Content   string `json:"content"`
			Type      string `json:"type"`
			Metadata  any    `json:"metadata"`
			ReplyToID *int64 `json:"reply_to_id"` // [NEW]
			Forwarded bool   `json:"forwarded"`   // [NEW]
		}
		if err := json.Unmarshal(message, &msgData); err == nil {
			// Handle Typing Events
			if msgData.Type == "typing_start" || msgData.Type == "typing_stop" {
				// Broadcast immediately without saving
				// We need to attach sender_id so clients know who is typing
				senderID := c.ID
				senderIDInt, _ := strconv.ParseInt(senderID, 10, 64)

				// Fetch sender name
				// Use a short timeout context
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				senderName, _ := c.Hub.Repo.GetUserSimple(ctx, senderIDInt)
				cancel()

				// log.Printf("WS: Broadcasting typing event for user %s (Name: %s)", senderID, senderName)

				broadcastMsg, _ := json.Marshal(map[string]interface{}{
					"type":        msgData.Type,
					"group_id":    msgData.GroupID,
					"sender_id":   senderID,
					"sender_name": senderName,
				})
				c.Hub.Broadcast <- broadcastMsg
				continue
			}

			// Handle Mark as Read
			if msgData.Type == "mark_read" {
				senderID := int64(0)
				if id, err := strconv.ParseInt(c.ID, 10, 64); err == nil {
					senderID = id
				}

				// Update DB
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				// Mark messages as 'seen'
				err := c.Hub.Repo.UpdateMessagesStatus(ctx, msgData.GroupID, senderID, "seen")
				// Also update Last Read At
				c.Hub.Repo.MarkMessagesRead(ctx, msgData.GroupID, senderID)
				cancel()

				if err != nil {
					log.Printf("Failed to mark messages read: %v", err)
					continue
				}

				// Broadcast to group members
				broadcastMsg, _ := json.Marshal(map[string]interface{}{
					"type":      "messages_read",
					"group_id":  msgData.GroupID,
					"reader_id": c.ID, // Notify who read it
				})
				c.Hub.Broadcast <- broadcastMsg
				continue
			}

			// Handle Message Deleted (broadcast to other clients)
			if msgData.Type == "message_deleted" {
				broadcastMsg, _ := json.Marshal(map[string]interface{}{
					"type":       "message_deleted",
					"group_id":   msgData.GroupID,
					"message_id": msgData.Content, // We reuse Content field for message ID
					"sender_id":  c.ID,
				})
				c.Hub.Broadcast <- broadcastMsg
				continue
			}

			// Handle Chat Messages (Save to DB)
			senderID := int64(0)
			if id, err := strconv.ParseInt(c.ID, 10, 64); err == nil {
				senderID = id
			}

			// We need context.Background() or a timeout context
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			savedMsg, err := c.Hub.Repo.SaveMessage(ctx, msgData.GroupID, senderID, msgData.Content, msgData.Type, msgData.Metadata, msgData.ReplyToID, msgData.Forwarded)
			if err != nil {
				log.Printf("Failed to save message: %v", err)
				continue
			}

			// Add metadata if present (Repo doesn't store it yet in this MVP simplification, but we pass it back)
			// Ideally we should update Repo to store metadata JSONB too.
			// For now, we just attach it to the broadcast so clients see it.
			// savedMsg is a struct, we can marshal it directly.

			// We need to include the structure that frontend expects.
			// The ChatMessage struct JSON tags match what frontend expects?
			// Repo: json:"sender_name", etc.
			// Frontend: ChatMessage interface in chat.service.ts

			if broadcastBytes, err := json.Marshal(savedMsg); err == nil {
				c.Hub.Broadcast <- broadcastBytes
			} else {
				log.Printf("Failed to marshal saved message: %v", err)
			}
		} else {
			log.Printf("Received invalid JSON message: %s", string(message))
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Removed batching of queued messages because it causes invalid JSON (concatenated objects)
			// e.g. {"type":...}{"type":...} which crashes JSON.parse on frontend.
			// Each message should be a distinct WebSocket frame.

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
