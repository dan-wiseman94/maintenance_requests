using Microsoft.AspNetCore.Mvc;
using MaintenanceApi.Data;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaintenanceRequestController(AppDbContext db) : ControllerBase
{

   
    [HttpGet(Name = "GetMaintenanceRequests")]
    public async Task<ActionResult<IEnumerable<Data.MaintenanceRequest>>> Get()
    {
        return await db.MaintenanceRequests.ToListAsync();
    }

    [HttpGet("{id:int}", Name = "GetMaintenanceRequest")]
    public async Task<ActionResult<Data.MaintenanceRequest>> GetById(int id)
    {
        var maintenanceRequest = await db.MaintenanceRequests.FindAsync(id);

        if (maintenanceRequest is null)
        {
            return NotFound();
        }

        return maintenanceRequest;
    }
}
