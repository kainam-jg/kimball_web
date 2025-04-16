#!/bin/bash

# Define variables
LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/web_server.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Start the web server on port 8501 in the background
echo "Starting Simple HTTP Server on port 8501..."
nohup python3 -m http.server 8501 > "$LOG_FILE" 2>&1 &

# Save the process ID (PID) for easy management
echo $! > web_server.pid
echo "Web server started with PID: $(cat web_server.pid)"
echo "Logs are being saved to $LOG_FILE"