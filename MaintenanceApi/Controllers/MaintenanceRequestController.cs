using Microsoft.AspNetCore.Mvc;
using MaintenanceApi.Data;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace MaintenanceApi.Controllers;

public record CreateMaintenanceRequest(
    [Required, MaxLength(255)] string Location,
    [Required, MaxLength(255)] string MaintenanceType,
    [Range(1, int.MaxValue)] int CreatedBy,
    [Required] RequestStatus RequestStatus
);

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

    [HttpPost("CreateMaintenanceRequest")]
    public async Task<ActionResult<MaintenanceRequest>> Create(CreateMaintenanceRequest request)
    {
        var new_request = new  MaintenanceRequest
        {
            Location = request.Location,
            MaintenanceType = request.MaintenanceType,
            CreatedBy = request.CreatedBy,
            RequestStatus = request.RequestStatus
        };

        db.MaintenanceRequests.Add(new_request);
        await db.SaveChangesAsync();
        return CreatedAtRoute("GetMaintenanceRequest", new {id = new_request.Id}, new_request);

    }

    [HttpPut("{id:int}", Name = "UpdateMainteanceRequest")]
    public async Task<ActionResult<MaintenanceRequest>> Update(int id, CreateMaintenanceRequest request)
    {
        var maintenance_request = await db.MaintenanceRequests.FindAsync(id);

        if (maintenance_request is null)
        {
            return NotFound();
        }
        maintenance_request.Location = request.Location;
        maintenance_request.MaintenanceType = request.MaintenanceType;
        maintenance_request.CreatedBy = request.CreatedBy;
        maintenance_request.RequestStatus = request.RequestStatus;
      

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}", Name = "DeleteMaintenanceRequest")]
    public async Task<IActionResult> Delete(int id)
    {
        var maintenance_request = await db.MaintenanceRequests.FindAsync(id);

        if (maintenance_request is null)
        {
            return NotFound();
        }
        db.MaintenanceRequests.Remove(maintenance_request);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
