# 🚀 FYP (NeuroSync)

<div align="center">

![.NET](https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=c-sharp&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**A production-ready ASP.NET Core Web API powering the FYP application**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-api-documentation) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Environment Configuration](#-environment-configuration)
- [Database Setup](#-database-setup)
- [Running the Application](#-running-the-application)
- [Testing](#-testing)
- [API Documentation](#-api-documentation)
- [Docker](#-docker)
- [Security](#-security)
- [CI/CD](#-cicd)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

This repository contains the backend API service for the **FYP (Final Year Project)** application. Built with **ASP.NET Core**, it provides a robust, scalable, and secure foundation for handling authentication, business logic, and data persistence for the Angular frontend.

### Core Responsibilities

```
🔐 Authentication & Authorization (JWT/Identity)
✅ Input Validation & Sanitization
💼 Business Logic & Data Management
💾 Database Operations with Entity Framework Core
📨 Background Jobs & Task Processing
📚 RESTful API with Swagger Documentation
```

---

## ✨ Features

- **🔒 Secure Authentication** - ASP.NET Core Identity with JWT tokens
- **🛡️ Role-Based Access Control** - Fine-grained permissions system
- **📊 EF Core Migrations** - Code-first database management
- **🧪 Comprehensive Testing** - xUnit & Integration tests
- **📖 Auto-Generated Docs** - Swagger/OpenAPI documentation
- **🐳 Docker Ready** - Containerized for easy deployment
- **🚦 Rate Limiting** - Built-in protection against abuse
- **📝 Structured Logging** - Serilog with structured logging
- **🔄 CI/CD Pipeline** - Automated testing and deployment
- **⚡ High Performance** - Async/await patterns throughout

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | ASP.NET Core 8.0+ |
| **Language** | C# 12 |
| **Database** | PostgreSQL 15+ |
| **ORM** | Entity Framework Core 8 |
| **Authentication** | ASP.NET Core Identity + JWT |
| **Testing** | xUnit + FluentAssertions |
| **Documentation** | Swagger / OpenAPI 3.0 |
| **Containerization** | Docker + Docker Compose |
| **Frontend** | Angular (separate repo/folder) |
| **Logging** | Serilog |
| **Validation** | FluentValidation |

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- ✅ **Git** - Version control
- ✅ **.NET SDK** (8.0 or later) - [Download](https://dotnet.microsoft.com/download)
- ✅ **PostgreSQL** (15+) - Database server
- ✅ **Docker & Docker Compose** (recommended)
- ✅ **Visual Studio 2022** / **VS Code** / **JetBrains Rider** (IDE)
- ✅ **Node.js** (for Angular frontend, if in same repo)

### Verify Installation

```bash
# Check .NET version
dotnet --version

# Check PostgreSQL
psql --version

# Check Docker
docker --version
```

---

## 🚀 Quick Start

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Zeeshan732/FYP.git
cd FYP/backend
```

### 2️⃣ Restore NuGet Packages

```bash
dotnet restore
```

### 3️⃣ Configure Environment

```bash
# Copy appsettings template
cp appsettings.example.json appsettings.Development.json

# Edit with your configuration
# Update connection strings and secrets
```

### 4️⃣ Setup Database

```bash
# Update database with migrations
dotnet ef database update

# Or using CLI tools
dotnet run --project src/YourProject.csproj -- seed
```

### 5️⃣ Start Development Server

```bash
dotnet run --project src/YourProject.csproj
# Or
dotnet watch run
```

🎉 **Server running at:** `https://localhost:5001` or `http://localhost:5000`

---

## ⚙️ Environment Configuration

### appsettings.json Structure

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=fyp_db;Username=postgres;Password=your_password"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "JwtSettings": {
    "Secret": "your-super-secret-jwt-key-min-32-chars",
    "Issuer": "FYP-API",
    "Audience": "FYP-Client",
    "ExpirationInMinutes": 60,
    "RefreshTokenExpirationInDays": 7
  },
  "EmailSettings": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SmtpUser": "your-email@gmail.com",
    "SmtpPassword": "your-app-password",
    "FromEmail": "noreply@fyp.com",
    "FromName": "FYP Team"
  },
  "CorsSettings": {
    "AllowedOrigins": ["http://localhost:4200", "https://yourdomain.com"]
  },
  "CloudStorage": {
    "Provider": "AWS",
    "BucketName": "your-bucket",
    "Region": "us-east-1",
    "AccessKey": "your-access-key",
    "SecretKey": "your-secret-key"
  },
  "RateLimiting": {
    "PermitLimit": 100,
    "Window": 60,
    "QueueLimit": 10
  }
}
```

### User Secrets (for Development)

```bash
# Initialize user secrets
dotnet user-secrets init --project src/YourProject.csproj

# Set secrets
dotnet user-secrets set "JwtSettings:Secret" "your-development-secret" --project src/YourProject.csproj
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "your-dev-connection" --project src/YourProject.csproj
```

> ⚠️ **Security Note:** Never commit `appsettings.Development.json` or `appsettings.Production.json` with sensitive data!

---

## 💾 Database Setup

### Using Entity Framework Core Migrations

```bash
# Add new migration
dotnet ef migrations add InitialCreate --project src/YourProject.csproj

# Update database
dotnet ef database update --project src/YourProject.csproj

# Revert last migration
dotnet ef migrations remove --project src/YourProject.csproj

# Generate SQL script
dotnet ef migrations script --project src/YourProject.csproj
```

### Seed Data

```bash
# Run seeder
dotnet run --project src/YourProject.csproj -- seed

# Or create DbInitializer in Program.cs
```

### Database Context Example

```csharp
public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<YourEntity> YourEntities { get; set; }
    
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // Configure entities
    }
}
```

---

## 🏃 Running the Application

### Development Mode

```bash
# Run with hot reload
dotnet watch run --project src/YourProject.csproj

# Or standard run
dotnet run --project src/YourProject.csproj
```

### Production Mode

```bash
# Build for production
dotnet publish -c Release -o ./publish

# Run published application
dotnet ./publish/YourProject.dll
```

### Using Visual Studio

1. Open `FYP.sln`
2. Set startup project
3. Press `F5` or click Run

### Useful Commands

| Command | Description |
|---------|-------------|
| `dotnet run` | Start application |
| `dotnet watch run` | Start with hot reload |
| `dotnet build` | Build the project |
| `dotnet test` | Run all tests |
| `dotnet publish` | Publish for deployment |
| `dotnet ef migrations add` | Create new migration |
| `dotnet ef database update` | Apply migrations |
| `dotnet clean` | Clean build artifacts |
| `dotnet restore` | Restore NuGet packages |

---

## 🧪 Testing

### Run All Tests

```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test /p:CollectCoverage=true /p:CoverageReporter=opencover

# Run specific test project
dotnet test tests/YourProject.Tests/YourProject.Tests.csproj
```

### Test Structure

```
tests/
├── YourProject.UnitTests/      # Unit tests
├── YourProject.IntegrationTests/ # Integration tests
└── YourProject.ApiTests/        # API endpoint tests
```

### Example Test

```csharp
public class UserServiceTests
{
    [Fact]
    public async Task CreateUser_ValidData_ReturnsUser()
    {
        // Arrange
        var service = new UserService();
        var userData = new CreateUserDto { /* ... */ };

        // Act
        var result = await service.CreateUserAsync(userData);

        // Assert
        result.Should().NotBeNull();
        result.Email.Should().Be(userData.Email);
    }
}
```

---

## 📚 API Documentation

### Interactive Documentation

Access the interactive Swagger UI at:

```
https://localhost:5001/swagger
```

### API Endpoints Overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login user | ❌ |
| `POST` | `/api/auth/refresh-token` | Refresh access token | ❌ |
| `GET` | `/api/users/profile` | Get user profile | ✅ |
| `PUT` | `/api/users/profile` | Update user profile | ✅ |
| `GET` | `/api/users/{id}` | Get user by ID | ✅ |
| `GET` | `/health` | Health check | ❌ |
| `GET` | `/api/swagger/v1/swagger.json` | OpenAPI spec | ❌ |

### Enable Swagger in Program.cs

```csharp
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "FYP API", 
        Version = "v1",
        Description = "Backend API for FYP Application"
    });
    
    // Add JWT authentication
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
});
```

---

## 🐳 Docker

### Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/YourProject.csproj", "src/"]
RUN dotnet restore "src/YourProject.csproj"
COPY . .
WORKDIR "/src/src"
RUN dotnet build "YourProject.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "YourProject.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "YourProject.dll"]
```

### Build Docker Image

```bash
docker build -t fyp-backend:latest .
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:80"
      - "5001:443"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__DefaultConnection=Host=postgres;Database=fyp_db;Username=postgres;Password=postgres
    depends_on:
      - postgres
    
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=fyp_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
      
  adminer:
    image: adminer
    ports:
      - "8080:8080"

volumes:
  postgres-data:
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend
```

---

## 🛡️ Security

### Best Practices Implemented

✅ **Input Validation** - FluentValidation for all DTOs  
✅ **SQL Injection Prevention** - Entity Framework parameterized queries  
✅ **XSS Protection** - Built-in ASP.NET Core protection  
✅ **CORS Configuration** - Strict origin policy  
✅ **Rate Limiting** - ASP.NET Core rate limiting middleware  
✅ **HTTPS Enforcement** - HSTS headers in production  
✅ **Secret Management** - User Secrets & Azure Key Vault  
✅ **JWT Security** - Short-lived tokens with refresh mechanism  
✅ **Password Hashing** - ASP.NET Core Identity with bcrypt  
✅ **Security Headers** - Custom middleware for headers  

### Security Middleware Configuration

```csharp
// Program.cs
app.UseHsts();
app.UseHttpsRedirection();
app.UseCors("CorsPolicy");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Add security headers
app.Use(async (context, next) =>
{
    context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Add("X-Frame-Options", "DENY");
    context.Response.Headers.Add("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Add("Referrer-Policy", "no-referrer");
    await next();
});
```

---

## 🔄 CI/CD

### GitHub Actions Pipeline

```yaml
name: .NET CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup .NET
      uses: actions/setup-dotnet@v3
      with:
        dotnet-version: 8.0.x
        
    - name: Restore dependencies
      run: dotnet restore
      
    - name: Build
      run: dotnet build --no-restore --configuration Release
      
    - name: Test
      run: dotnet test --no-build --verbosity normal --configuration Release
      
    - name: Publish
      run: dotnet publish -c Release -o ./publish
      
    - name: Build Docker image
      run: docker build -t fyp-backend:${{ github.sha }} .
```

### Deployment Environments

- **Development** - Auto-deploy from `develop` branch
- **Staging** - Auto-deploy from `staging` branch
- **Production** - Manual approval required from `main` branch

---

## 🔧 Troubleshooting

### Common Issues

#### ❌ Database Connection Error

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d fyp_db

# Check connection string in appsettings
# Verify PostgreSQL service is running
sudo systemctl status postgresql  # Linux
# or check Windows services

# View EF Core logs
dotnet ef database update --verbose
```

#### ❌ Port Already in Use

```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9

# Or change port in Properties/launchSettings.json
```

#### ❌ Migration Errors

```bash
# Drop and recreate database (⚠️ WARNING: destroys data)
dotnet ef database drop --force
dotnet ef database update

# Or revert migrations
dotnet ef migrations remove
```

#### ❌ NuGet Package Restore Issues

```bash
# Clear NuGet cache
dotnet nuget locals all --clear

# Restore packages
dotnet restore --force
```

### Logs Location

- **Development:** Console output + Debug window
- **Production:** `/logs` directory (if configured with Serilog)
- **Docker:** `docker-compose logs -f backend`

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### 1️⃣ Fork & Clone

```bash
git clone https://github.com/YOUR-USERNAME/FYP.git
```

### 2️⃣ Create Feature Branch

```bash
git checkout -b feature/amazing-feature
```

### 3️⃣ Commit Changes

```bash
git commit -m "feat: add amazing feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

### 4️⃣ Push & Create PR

```bash
git push origin feature/amazing-feature
```

### Code Review Checklist

- [ ] Tests pass locally (`dotnet test`)
- [ ] Code follows C# conventions
- [ ] XML documentation added for public APIs
- [ ] Migrations created if schema changed
- [ ] appsettings.example.json updated if needed
- [ ] No sensitive data in commits
- [ ] Breaking changes documented

---

## 📞 Support & Contact

### 👨‍💻 Maintainer

**Zeeshan732**
- GitHub: [@Zeeshan732](https://github.com/Zeeshan732)
- Email: your-email@example.com

### 🐛 Bug Reports

Found a bug? [Open an issue](https://github.com/Zeeshan732/FYP/issues/new?template=bug_report.md)

### 💡 Feature Requests

Have an idea? [Request a feature](https://github.com/Zeeshan732/FYP/issues/new?template=feature_request.md)

### 🔒 Security Vulnerabilities

Please report security issues to: **security@example.com**

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 📊 Project Status

![Build Status](https://img.shields.io/github/workflow/status/Zeeshan732/FYP/CI)
![Coverage](https://img.shields.io/codecov/c/github/Zeeshan732/FYP)
![Issues](https://img.shields.io/github/issues/Zeeshan732/FYP)
![Pull Requests](https://img.shields.io/github/issues-pr/Zeeshan732/FYP)
![Last Commit](https://img.shields.io/github/last-commit/Zeeshan732/FYP)

---

## 🗓️ Changelog

### [1.0.0] - 2025-01-XX

#### Added
- Initial release with ASP.NET Core 8
- JWT authentication with Identity
- PostgreSQL database integration
- Entity Framework Core migrations
- Swagger/OpenAPI documentation
- Docker support
- CI/CD pipeline with GitHub Actions

See [CHANGELOG.md](CHANGELOG.md) for full version history.

---

## 📦 NuGet Packages Used

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.*" />
  <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="8.0.*" />
  <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.*" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.*" />
  <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.*" />
  <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.*" />
  <PackageReference Include="FluentValidation.AspNetCore" Version="11.3.*" />
  <PackageReference Include="Serilog.AspNetCore" Version="8.0.*" />
  <PackageReference Include="AutoMapper.Extensions.Microsoft.DependencyInjection" Version="12.0.*" />
</ItemGroup>
```

---

<div align="center">

**Made with ❤️ by the Zeeshan Nawaz**

**Tech Stack:** ASP.NET Core 8 + Angular + PostgreSQL

⭐ Star us on GitHub — it motivates us a lot!

[⬆ Back to Top](#-fyp-backend-api)

</div>
