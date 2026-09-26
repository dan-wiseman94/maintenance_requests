using System.Net;
using System.Net.Http.Json;
using MaintenanceApi.Controllers;
using MaintenanceApi.Data;

namespace MaintenanceApi.Tests;

public class MaintenanceRequestAuthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static object NewRequest(int? createdBy = null) => new
    {
        location = "12 Test St - Kitchen", maintenanceType = "Plumbing", createdBy, requestStatus = "Open",
    };

    [Fact]
    public async Task List_WithoutSession_Returns401()
    {
        var response = await factory.CreateClient().GetAsync("/api/maintenancerequest");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsTenant_IgnoresSuppliedCreatedBy()
    {
        var client = await factory.ClientAs(UserRole.Tenant);      // id 1

        var response = await client.PostAsJsonAsync("/api/maintenancerequest/CreateMaintenanceRequest", NewRequest(createdBy: 3));
        var body = await response.Content.ReadFromJsonAsync<MaintenanceRequestResponse>(ApiFactory.Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, body!.CreatedBy);
    }

    [Fact]
    public async Task Create_AsAdmin_HonoursSuppliedCreatedBy()
    {
        var client = await factory.ClientAs(UserRole.Admin);       // id 3

        var response = await client.PostAsJsonAsync("/api/maintenancerequest/CreateMaintenanceRequest", NewRequest(createdBy: 1));
        var body = await response.Content.ReadFromJsonAsync<MaintenanceRequestResponse>(ApiFactory.Json);

        Assert.Equal(1, body!.CreatedBy);
    }

    [Theory]
    [InlineData(UserRole.Tenant, HttpStatusCode.Forbidden)]
    [InlineData(UserRole.Maintenance, HttpStatusCode.Forbidden)]
    [InlineData(UserRole.Admin, HttpStatusCode.NotFound)]        // past the gate; 9999 does not exist
    public async Task Delete_IsAdminOnly(UserRole role, HttpStatusCode expected)
    {
        var client = await factory.ClientAs(role);
        var response = await client.DeleteAsync("/api/maintenancerequest/9999");
        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public async Task Update_AsTenant_Returns403()
    {
        var client = await factory.ClientAs(UserRole.Tenant);
        var response = await client.PutAsJsonAsync("/api/maintenancerequest/9999", NewRequest());
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}