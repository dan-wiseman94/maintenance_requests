using Microsoft.AspNetCore.Mvc;
using MaintenanceApi.Data;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;

namespace MaintenanceApi.Controllers;

public record UserResponse(
    int Id,
    string FirstName,
    string LastName,
    string Email,
    string Address,
    UserRole UserRole
)
{
    public static UserResponse From(User user) => new(
        user.Id,
        user.FirstName,
        user.LastName,
        user.Email,
        user.Address,
        user.UserRole
    );
};
public record CreateUserRequest(
    [Required, MaxLength(255)] string FirstName,
    [Required, MaxLength(255)] string LastName,
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MaxLength(255)] string Password,
    [Required, MaxLength(255)] string Address,
    [Required] UserRole UserRole
);

public record UpdateUserRequest(
    [Required, MaxLength(255)] string FirstName,
    [Required, MaxLength(255)] string LastName,
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MaxLength(255)] string Address,
    [Required] UserRole UserRole
);


[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UserController(AppDbContext db, IPasswordHasher<User> hasher) : ControllerBase
{
    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    [HttpGet(Name = "GetUsers")]
    public async Task<ActionResult<PagedResult<UserResponse>>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string orderBy = "lastName",
        [FromQuery] bool desc = false
    )
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        IQueryable<User> query = db.Users.AsNoTracking();

        query = orderBy?.Trim() switch
        {
            "firstName" => query.OrderByDirection(u => u.FirstName, desc, u => u.Id),
            "lastName" => query.OrderByDirection(u => u.LastName, desc, u => u.Id),
            "address" => query.OrderByDirection(u => u.Address, desc, u => u.Id),
            "userRole" => query.OrderByDirection(u => u.UserRole, desc, u => u.Id),
            _ => query.OrderByDirection(u => u.LastName, desc, u => u.Id)
        };

        var projected = query.Select(u => new UserResponse(
            u.Id,
            u.FirstName,
            u.LastName,
            u.Email,
            u.Address,
            u.UserRole
        ));

        var totalCount = await projected.CountAsync();
        var items = await projected
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResult<UserResponse>(
            items,
            page,
            pageSize,
            totalCount);

    }

    [HttpGet("{id:int}", Name = "GetUser")]
    public async Task<ActionResult<UserResponse>> GetById(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound();

        }
        return UserResponse.From(user);
    }

    [HttpGet("role/{role}", Name = "GetUsersByRole")]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetByRole(
        UserRole role,
        [FromQuery] string? q = null,
        [FromQuery] int limit = 10
        )

    {
        if (!Enum.IsDefined(role))
        {
            return BadRequest();
        }
        limit = Math.Clamp(limit, 1, 50);

        IQueryable<User> query = db.Users
            .AsNoTracking()
            .Where(r => r.UserRole == role);

        q = q?.Trim();
        if (!string.IsNullOrEmpty(q))
        {
            query = query.Where(u =>
            u.LastName.StartsWith(q) || u.FirstName.StartsWith(q));
        }

        var users = await query
            .OrderBy(r => r.LastName)
            .ThenBy(r => r.FirstName)
            .Take(limit)
            .ToListAsync();

        var userResponses = users.Select(UserResponse.From);
        return userResponses.ToList();
    }

    [HttpPost(Name = "CreateUser")]
    public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request)
    {
        var email = NormalizeEmail(request.Email);

        if (await db.Users.AnyAsync(u => u.Email == email))
        {
            return Conflict(new { message = "Email already exists." });
        }
        var user = new User
        {
            FirstName = request.FirstName,
            Email = email,
            LastName = request.LastName,
            Address = request.Address,
            UserRole = request.UserRole,
        };

        user.PasswordHash = hasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return CreatedAtRoute("GetUser", new { id = user.Id }, UserResponse.From(user));

    }

    [HttpPut("{id:int}", Name = "UpdateUser")]
    public async Task<ActionResult<UserResponse>> Update(int id, UpdateUserRequest request)
    {
        var email = NormalizeEmail(request.Email);
        if (await db.Users.AnyAsync(u => u.Email == email && u.Id != id))
        {
            return Conflict(new { message = "Email already exists." });
        }
        var user = await db.Users.FindAsync(id);

        if (user is null)
        { return NotFound(); }

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Email = email;
        user.Address = request.Address;
        user.UserRole = request.UserRole;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}", Name = "DeleteUser")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound();
        }

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return NoContent();
    }

}