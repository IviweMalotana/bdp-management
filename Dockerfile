# ── Build stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY BDP.API/BDP.API.csproj BDP.API/
RUN dotnet restore BDP.API/BDP.API.csproj

COPY BDP.API/ BDP.API/
WORKDIR /src/BDP.API
RUN dotnet publish -c Release -o /publish

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Create wwwroot directories so static file middleware is happy
RUN mkdir -p /app/wwwroot/invoices /app/wwwroot/uploads/artwork

COPY --from=build /publish ./

# Railway injects PORT at runtime; Program.cs reads it
EXPOSE 8080
ENTRYPOINT ["dotnet", "BDP.API.dll"]
