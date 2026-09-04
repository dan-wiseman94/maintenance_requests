using Microsoft.AspNetCore.Mvc;
using MaintenanceApi.Data;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace MaintenanceApi.Controllers;


public record CreateUserRequest(
    [Required, MaxLength(255)] string FirstName,
    [Required, MaxLength(255)] string LastName,
    [Required, MaxLength(255)] string Address,
    [Range(1, int.MaxValue)] int RoleId
);

[ApiController]
[Route("api/[controller]")]
public class UserController(AppDbContext db) : ControllerBase
{
   
    [HttpGet(Name = "GetUsers")]
    public async Task<ActionResult<IEnumerable<User>>> Get()
    {
        return await db.Users.ToListAsync();
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
            RoleId = request.RoleId,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return CreatedAtRoute("GetUser", new {id = user.Id}, user);

    }

        
}