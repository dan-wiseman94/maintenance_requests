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

}