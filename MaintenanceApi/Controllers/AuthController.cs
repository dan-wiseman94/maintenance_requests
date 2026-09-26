using System.ComponentModel.DataAnnotations;
using MaintenanceApi.Data;
using MaintenanceApi.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;

namespace MaintenanceApi.Controllers;

public record LoginRequest(
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MaxLength(255)] string Password
);

public record ChangePasswordRequest(
    [Required, MaxLength(128)] string CurrentPassword,
    [Required, MinLength(8), MaxLength(128)] string NewPassword
);

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IPasswordHasher<User> hasher) : Controller
{
    private static readonly string DummyHash =
    new PasswordHasher<User>().HashPassword(new User(), "dummy-password");

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<ActionResult<UserResponse>> Login(LoginRequest request)
    {
        var email = NormalizeEmail(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);
        var result = hasher.VerifyHashedPassword(user ?? new User(), user?.PasswordHash ?? DummyHash, request.Password);

        if (user is null || result == PasswordVerificationResult.Failed)
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = hasher.HashPassword(user, request.Password);
            await db.SaveChangesAsync();
        }

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, UserClaims.ToPrincipal(user));

        return UserResponse.From(user);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var user = await db.Users.FindAsync(User.GetUserId());
        if (user is null)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized();
        }
        return UserResponse.From(user);
    }

    [HttpPost("password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var user = await db.Users.FindAsync(User.GetUserId());
        if (user is null) return Unauthorized();

        var check = hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (check == PasswordVerificationResult.Failed)
            return BadRequest(new { message = "Current password is incorrect." });

        user.PasswordHash = hasher.HashPassword(user, request.NewPassword);
        await db.SaveChangesAsync();
        return NoContent();
    }

}