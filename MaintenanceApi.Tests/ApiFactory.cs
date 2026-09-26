using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MaintenanceApi.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MaintenanceApi.Tests;

public class ApiFactory : WebApplicationFactory<Program>
{

    private readonly string _dbName = Guid.NewGuid().ToString();

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public const string Password = "correct-horse-battery";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase(_dbName);
            });
        });
    }

    /// One user per role, ids 1..3 all with the same password. Idempotent
    public void SeedRoles()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (db.Users.Any()) return;

        var hasher = new PasswordHasher<User>();
        foreach (var (id, role) in new[] { (1, UserRole.Tenant), (2, UserRole.Maintenance), (3, UserRole.Admin) })
        {
            var user = new User
            {
                Id = id,
                Email = $"{role.ToString().ToLowerInvariant()}@test.local",
                FirstName = role.ToString(),
                LastName = "User",
                Address = $"{id} Test St",
                UserRole = role,
            };
            user.PasswordHash = hasher.HashPassword(user, Password);
            db.Users.Add(user);
        }
        db.SaveChanges();
    }

    public async Task<HttpClient> ClientAs(UserRole role)
    {
        SeedRoles();
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = $"{role.ToString().ToLowerInvariant()}@test.local",
            password = Password,
        });
        response.EnsureSuccessStatusCode();
        return client;
    }
}