using Microsoft.AspNetCore.Mvc;
using MaintenanceApi.Data;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace MaintenanceApi.Controllers;


public record CreateUserRequest(
    [Required, MaxLength(255)] string FirstName,
    [Required, MaxLength(255)] string LastName,
    [Required, MaxLength(255)] string Address,
    [Required] UserRole UserRole
);


[ApiController]
[Route("api/[controller]")]
public class UserController(AppDbContext db) : ControllerBase
{
   
    [HttpGet(Name = "GetUsers")]
    public async Task<ActionResult<PagedResult<User>>> Get(
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

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var pagedResult = new PagedResult<User>(
            items,
            page,
            pageSize,
            totalCount);

        return pagedResult;
    }

    [HttpGet("{id:int}", Name = "GetUser")]
    public async Task<ActionResult<User>> GetById(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null)
        {
            return NotFound();

        }
        return user;
    }

    [HttpPost (Name = "CreateUser")]
    public async Task<ActionResult<User>> Create(CreateUserRequest request)
    {
        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Address = request.Address,
            UserRole = request.UserRole,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return CreatedAtRoute("GetUser", new {id = user.Id}, user);

    }

    [HttpPut ("{id:int}", Name = "UpdateUser")]
    public async Task<ActionResult<User>> Update(int id, CreateUserRequest request)
    {
        var user = await db.Users.FindAsync(id);

        if (user is null)
        {   return NotFound();}

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
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