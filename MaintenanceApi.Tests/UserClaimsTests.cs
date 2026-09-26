using System.Security.Claims;
using MaintenanceApi.Auth;
using MaintenanceApi.Data;

namespace MaintenanceApi.Tests;

public class UserClaimsTests
{
    private static readonly User Sample = new()
    {
        Id = 42, Email = "ada@example.com", FirstName = "Ada", LastName = "Wong", UserRole = UserRole.Maintenance,
    };

    [Fact]
    public void ToPrincipal_IsAuthenticated_AndCarriesIdNameRole()
    {
        var principal = UserClaims.ToPrincipal(Sample);

        Assert.True(principal.Identity!.IsAuthenticated);
        Assert.Equal(42, principal.GetUserId());
        Assert.Equal("Ada Wong", principal.Identity.Name);
        Assert.True(principal.IsInRole(UserRole.Maintenance));
        Assert.False(principal.IsInRole(UserRole.Admin));
    }

    [Fact]
    public void GetUserId_Throws_WhenClaimMissing()
    {
        var anonymous = new ClaimsPrincipal(new ClaimsIdentity());
        Assert.Throws<InvalidOperationException>(() => anonymous.GetUserId());
    }
}