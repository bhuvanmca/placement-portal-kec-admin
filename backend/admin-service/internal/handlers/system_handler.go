package handlers

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// StorageInfo represents disk and storage information
type StorageInfo struct {
	TotalCapacityGB   int                 `json:"total_capacity_gb"`
	UsedGB            float64             `json:"used_gb"`
	AvailableGB       float64             `json:"available_gb"`
	UsedPercent       float64             `json:"used_percent"`
	AlertThreshold    int                 `json:"alert_threshold_percent"`
	IsLowStorage      bool                `json:"is_low_storage"`
	RootDiskUsage     string              `json:"root_disk_usage"`
	DockerVolumesInfo []DockerVolumeInfo  `json:"docker_volumes"`
	DockerError       string              `json:"docker_error,omitempty"` // [NEW] Capture why docker failed
	GarageStats       *GarageStorageStats `json:"garage_stats,omitempty"`
}

// DockerVolumeInfo represents info about a docker volume
type DockerVolumeInfo struct {
	Name string `json:"name"`
	Size string `json:"size"`
}

// GarageStorageStats represents Garage storage information
type GarageStorageStats struct {
	ObjectCount int64  `json:"object_count"`
	TotalSize   string `json:"total_size"`
}

// ... (keep DockerVolumeInfo and GarageStorageStats same)

// GetStorageInfo returns disk usage and container storage statistics
// ... (keep swagger comments)
func GetStorageInfo(c *fiber.Ctx) error {
	info := StorageInfo{
		AlertThreshold: 80, // Alert when 80% full
	}

	// 1. Get root disk usage using df -k
	// ... (keep df logic same) ...
	dfCmd := exec.Command("df", "-k", "/")
	dfOutput, err := dfCmd.Output()
	if err == nil {
		lines := strings.Split(string(dfOutput), "\n")
		if len(lines) > 1 {
			fields := strings.Fields(lines[1])
			if len(fields) >= 4 {
				totalKB, _ := strconv.ParseFloat(fields[1], 64)
				usedKB, _ := strconv.ParseFloat(fields[2], 64)
				availKB, _ := strconv.ParseFloat(fields[3], 64)

				info.TotalCapacityGB = int(totalKB / (1024 * 1024))
				info.UsedGB = usedKB / (1024 * 1024)
				info.AvailableGB = availKB / (1024 * 1024)

				if info.TotalCapacityGB > 0 {
					info.UsedPercent = (info.UsedGB / float64(info.TotalCapacityGB)) * 100
				}
				info.IsLowStorage = info.UsedPercent >= float64(info.AlertThreshold)
				info.RootDiskUsage = fmt.Sprintf("%dGB / %dGB (%.1f%%)", int(info.UsedGB), info.TotalCapacityGB, info.UsedPercent)
			}
		}
	} else {
		fmt.Printf("Error running df: %v\n", err)
	}

	// 2. Get Docker volume sizes
	path, err := exec.LookPath("docker")
	if err == nil {
		// Found docker at 'path'
		volumeCmd := exec.Command(path, "volume", "ls", "--format", "{{.Name}}")
		volumeOutput, err := volumeCmd.Output()
		if err == nil {
			volumes := strings.Split(strings.TrimSpace(string(volumeOutput)), "\n")
			for _, volumeName := range volumes {
				if volumeName == "" {
					continue
				}
				sizeCmd := exec.Command("sh", "-c",
					fmt.Sprintf("%s system df -v | grep %s | awk '{print $3, $4}'", path, volumeName))
				sizeOutput, _ := sizeCmd.Output()

				sizeStr := strings.TrimSpace(string(sizeOutput))
				if sizeStr == "" {
					sizeStr = "Unknown"
				}

				volumeInfo := DockerVolumeInfo{
					Name: volumeName,
					Size: sizeStr,
				}
				info.DockerVolumesInfo = append(info.DockerVolumesInfo, volumeInfo)
			}
		} else {
			// Docker command failed (permission? daemon not running?)
			info.DockerError = fmt.Sprintf("Command failed: %v", err)
		}
	} else {
		info.DockerError = "Docker CLI not found in PATH"
	}

	// 3. Get Garage statistics
	// ... (keep garage logic same) ...
	garageCmd := exec.Command("docker", "exec", "local_storage", "/garage", "bucket", "info", "placement-portal-bucket")
	garageOutput, err := garageCmd.Output()
	if err == nil {
		stats := parseGarageStats(string(garageOutput))
		if stats != nil {
			info.GarageStats = stats
		}
	}

	return c.JSON(info)
}

// parseGarageStats extracts object count and size from garage bucket info output
func parseGarageStats(output string) *GarageStorageStats {
	lines := strings.Split(output, "\n")
	stats := &GarageStorageStats{}

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Parse "Objects: 123"
		if strings.HasPrefix(line, "Objects:") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				if count, err := strconv.ParseInt(parts[1], 10, 64); err == nil {
					stats.ObjectCount = count
				}
			}
		}

		// Parse "Size: 1.2 MB (1234567 B)"
		if strings.HasPrefix(line, "Size:") {
			// Extract everything after "Size: "
			sizeInfo := strings.TrimPrefix(line, "Size:")
			stats.TotalSize = strings.TrimSpace(sizeInfo)
		}
	}

	return stats
}

// GetSystemHealth returns overall system health status
// @Summary Get System Health
// @Description Get overall system health including API, database, and storage status
// @Tags System
// @Produce json
// @Success 200 {string} string "OK"
// @Router /v1/health [get]
func GetSystemHealth(c *fiber.Ctx) error {
	health := fiber.Map{
		"status":  "healthy",
		"api":     "operational",
		"storage": "operational",
	}

	// Quick check if we can execute commands
	if _, err := exec.Command("df", "-h", "/").Output(); err != nil {
		health["status"] = "degraded"
		health["storage"] = "unreachable"
	}

	return c.JSON(health)
}
