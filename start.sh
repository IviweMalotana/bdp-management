#!/bin/bash
# Start BDP API + Frontend

pkill -f "BDP.API" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

echo "Starting BDP API on http://localhost:5252 ..."
DOTNET_ROOT=$HOME/.dotnet \
ASPNETCORE_ENVIRONMENT=Development \
ASPNETCORE_URLS="http://localhost:5252" \
  $HOME/.dotnet/dotnet run --no-build \
    --project /Users/iviwe/Desktop/BDP/BDP.API/BDP.API.csproj \
    --launch-profile "" \
  > /tmp/bdp_api.log 2>&1 &
echo "API PID: $!"

sleep 5

echo "Starting Vite frontend on http://localhost:5173 ..."
/Users/iviwe/Desktop/BDP/BDP.Web/node_modules/.bin/vite --port 5173 \
  > /tmp/bdp_vite.log 2>&1 &
echo "Vite PID: $!"

echo ""
echo "Both services started."
echo "  Frontend : http://localhost:5173"
echo "  API      : http://localhost:5252"
echo "Logs: /tmp/bdp_api.log  /tmp/bdp_vite.log"
