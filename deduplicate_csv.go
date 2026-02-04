package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strings"
)

func main() {
	inputPath := "backend/assets/students_100.csv"
	file, err := os.Open(inputPath)
	if err != nil {
		log.Fatal(err)
	}

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	file.Close()
	if err != nil {
		log.Fatal(err)
	}

	seenEmails := make(map[string]bool)
	newRecords := [][]string{records[0]} // Keep header

	fixedCount := 0

	for i, row := range records {
		if i == 0 {
			continue
		}

		email := row[0]
		originalEmail := email

		// Split email (user + domain)
		parts := strings.Split(email, "@")
		if len(parts) != 2 {
			log.Fatalf("Invalid email format line %d: %s", i+1, email)
		}
		userPart := parts[0]
		domainPart := parts[1]

		// Dumb logic: assume format is name.24mca
		// Extract base name
		baseParts := strings.Split(userPart, ".")
		baseName := baseParts[0] // "sai"
		suffix := ".24mca"
		if len(baseParts) > 1 {
			suffix = "." + strings.Join(baseParts[1:], ".")
		}

		counter := 1
		for seenEmails[email] {
			counter++
			email = fmt.Sprintf("%s%d%s@%s", baseName, counter, suffix, domainPart)
		}

		if email != originalEmail {
			fmt.Printf("Fixed duplicate: %s -> %s\n", originalEmail, email)
			fixedCount++
			row[0] = email
		}

		seenEmails[email] = true
		newRecords = append(newRecords, row)
	}

	// Write back
	outFile, err := os.Create(inputPath)
	if err != nil {
		log.Fatal(err)
	}
	defer outFile.Close()

	writer := csv.NewWriter(outFile)
	writer.WriteAll(newRecords)

	if err := writer.Error(); err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Successfully deduplicated %d emails.\n", fixedCount)
}
