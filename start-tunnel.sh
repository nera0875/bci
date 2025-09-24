#!/bin/bash

# Script pour démarrer le serveur avec tunnel SSH
echo "🚀 Starting BCI Tool with SSH Tunnel..."

# Kill any existing npm processes
pkill -f "npm run dev" 2>/dev/null

# Start the development server
cd /home/pilote/projets/bci
npm run dev &

echo ""
echo "✅ Server started on localhost:3001"
echo ""
echo "📡 To access from your PC, use SSH tunnel:"
echo "   ssh -L 3001:localhost:3001 pilote@84.247.131.60"
echo ""
echo "🌐 Then open: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"

# Keep script running
wait