using System.Net;
using MaintenanceApi.Data;


namespace MaintenanceApi.Tests;

public class UserAuthTests(ApiFactory factor) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task List_WithoutSession_Returns401()
    {
        var response = await factor.CreateClient().GetAsync("/api/user");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(UserRole.Tenant, HttpStatusCode.Forbidden)]
    [InlineData(UserRole.Maintenance, HttpStatusCode.Forbidden)]
    [InlineData(UserRole.Admin, HttpStatusCode.OK)]
    public async Task List_IsAdminOnly(UserRole role, HttpStatusCode expected)
    {
        var client = await factor.ClientAs(role);
        var response = await client.GetAsync("/api/user");
        Assert.Equal(expected, response.StatusCode);
    }
}