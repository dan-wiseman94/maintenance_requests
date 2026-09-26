using MaintenanceApi.Controllers;
using MaintenanceApi.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

public class UserControllerTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;      

        return new AppDbContext(options);  
    }

    private static UserController NewController(AppDbContext db) =>
        new(db, new PasswordHasher<User>());

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenUserMissing()
    {
        using var db = NewDb();
        var controller = NewController(db);

        var result = await controller.GetById(999);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsUser_WhenPresent()
    {
        using var db = NewDb();
        db.Users.Add(new User { Id = 1, FirstName = "Ada", LastName = "Wong", UserRole = UserRole.Admin});
        var controller = NewController(db);
        var result = await controller.GetById(1);

        Assert.Equal("Ada", result.Value!.FirstName);
    }

    [Fact]
    public async Task Create_HashesPassword_AndNeverReturnsIt()
    {
        using var db = NewDb();
        var controller = NewController(db);

        var request = new CreateUserRequest("Ada", "Wong", "Ada@Example.com", "correct-horse", "1 Main St", UserRole.Tenant);    

        var result = await controller.Create(request);

        var created = Assert.IsType<CreatedAtRouteResult>(result.Result);
        var body = Assert.IsType<UserResponse>(created.Value);
        Assert.Equal("ada@example.com", body.Email);
        var stored = await db.Users.SingleAsync();
        Assert.NotEqual("correct-horse", stored.PasswordHash);

        Assert.Equal(PasswordVerificationResult.Success, new PasswordHasher<User>().VerifyHashedPassword(stored, stored.PasswordHash, "correct-horse"));
    }

[Fact]
    public async Task Create_ReturnsConflict_WhenEmailTaken()
    {
        using var db = NewDb();
        db.Users.Add(new User { Id = 1, Email = "taken@example.com", FirstName = "A", LastName = "B", Address = "x", UserRole = UserRole.Tenant });
        await db.SaveChangesAsync();
        var controller = NewController(db);

        var result = await controller.Create(new CreateUserRequest("C", "D", "TAKEN@example.com", "password123", "y", UserRole.Tenant));

        Assert.IsType<ConflictObjectResult>(result.Result);
    }


}