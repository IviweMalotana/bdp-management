# ── Stage 1: Build React frontend ─────────────────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /app/BDP.Web
COPY BDP.Web/package*.json ./
RUN npm ci
COPY BDP.Web/ ./
RUN npm run build
# Output lands at /app/BDP.API/wwwroot (vite.config outDir: ../BDP.API/wwwroot)

# ── Stage 2: Build & publish .NET API ─────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS backend
WORKDIR /app
COPY BDP.API/ ./BDP.API/
# Bring in the React build output before dotnet publish
COPY --from=frontend /app/BDP.API/wwwroot ./BDP.API/wwwroot
WORKDIR /app/BDP.API
RUN dotnet restore
# SkipFrontend=true prevents the csproj target from running npm (no Node here)
RUN dotnet publish -c Release -o /publish --no-restore -p:SkipFrontend=true

# ── Stage 3: Runtime ───────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS runtime
WORKDIR /app
COPY --from=backend /publish ./
EXPOSE 8080
# PORT env var is read by Program.cs at startup (Railway sets this dynamically)
ENTRYPOINT ["dotnet", "BDP.API.dll"]
