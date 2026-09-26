using System.Net;
using System.Net.Http.Json;
using MaintenanceApi.Controllers;
using MaintenanceApi.Data;

namespace MaintenanceApi.Tests;

public class AuthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Login_WithValidCredentials_SetsCookie_AndReturnsUser()
    {
        factory.SeedRoles();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new { email = "ADMIN@test.local", password = ApiFactory.Password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith("maintenance.session=", cookie);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);

        var body = await response.Content.ReadFromJsonAsync<UserResponse>(ApiFactory.Json);
        Assert.Equal("admin@test.local", body!.Email);
        Assert.Equal(UserRole.Admin, body.UserRole);
    }

    [Theory]
    [InlineData("admin@test.local", "wrong-password")]
    [InlineData("nobody@test.local", ApiFactory.Password)]
    public async Task Login_WithBadCredentials_Returns401_WithoutCookie(string email, string password)
    {
        factory.SeedRoles();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Me_WithoutCookie_Returns401_NotRedirect()
    {
        var response = await factory.CreateClient().GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_AfterLogin_ReturnsSignedInUser()
    {
        var client = await factory.ClientAs(UserRole.Tenant);

        var me = await client.GetFromJsonAsync<UserResponse>("/api/auth/me", ApiFactory.Json);

        Assert.Equal(1, me!.Id);
        Assert.Equal(UserRole.Tenant, me.UserRole);
    }

    [Fact]
    public async Task Logout_EndsTheSession()
    {
        var client = await factory.ClientAs(UserRole.Tenant);

        var logout = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }


    [Fact]
    public async Task ChangePassword_ReplacesTheHash_AndOldPasswordStopsWorking()
    {
        var client = await factory.ClientAs(UserRole.Maintenance);

        var change = await client.PostAsJsonAsync("/api/auth/password",
            new { currentPassword = ApiFactory.Password, newPassword = "a-brand-new-one" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        var fresh = factory.CreateClient();
        var old = await fresh.PostAsJsonAsync("/api/auth/login", new { email = "maintenance@test.local", password = ApiFactory.Password });
        Assert.Equal(HttpStatusCode.Unauthorized, old.StatusCode);
        var @new = await fresh.PostAsJsonAsync("/api/auth/login", new { email = "maintenance@test.local", password = "a-brand-new-one" });
        Assert.Equal(HttpStatusCode.OK, @new.StatusCode);
    }
}