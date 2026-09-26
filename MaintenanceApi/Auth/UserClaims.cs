using System.Security.Claims; 
using MaintenanceApi.Data;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace MaintenanceApi.Auth;

public static class UserClaims
{
    public static ClaimsPrincipal ToPrincipal(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new(ClaimTypes.Role, user.UserRole.ToString())
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }
}

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id) ? id : throw new InvalidOperationException("User ID claim is missing or invalid.");

    }

    public static bool IsInRole(this ClaimsPrincipal principal, UserRole role)
    => principal.IsInRole(role.ToString());
}

