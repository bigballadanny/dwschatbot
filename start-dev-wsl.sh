#!/bin/bash

echo "🚀 Starting development server for WSL..."

# Get the WSL IP address
WSL_IP=$(hostname -I | awk '{print $1}')
echo "📍 WSL IP Address: $WSL_IP"

# Kill any existing vite processes
pkill -f vite 2>/dev/null || true

# Start the dev server
echo "🔧 Starting Vite on port 5173..."
npm run dev &

# Wait for server to start
sleep 5

echo ""
echo "✅ Development server started!"
echo ""
echo "🌐 Try accessing the app using these URLs:"
echo "   1. http://localhost:5173/"
echo "   2. http://127.0.0.1:5173/"
echo "   3. http://$WSL_IP:5173/"
echo ""
echo "🔧 If none of these work, run this in Windows PowerShell (as Administrator):"
echo "   netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$WSL_IP"
echo ""
echo "📝 To check if port forwarding exists:"
echo "   netsh interface portproxy show all"
echo ""
echo "🗑️  To remove port forwarding:"
echo "   netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0"
echo ""
echo "Press Ctrl+C to stop the server"

# Keep the script running
wait