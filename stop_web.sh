#!/bin/bash

# Check if PID file exists
if [[ -f "web_server.pid" ]]; then
    PID=$(cat web_server.pid)
    echo "Stopping web server (PID: $PID)..."
    kill $PID
    rm web_server.pid
    echo "Web server stopped."
else
    echo "No web server PID file found. Searching for process..."
    # Find and kill any process running on port 8501
    PID=$(lsof -t -i:8501)
    if [[ -n "$PID" ]]; then
        kill $PID
        echo "Web server stopped (PID: $PID)."
    else
        echo "No running web server found."
    fi
fi