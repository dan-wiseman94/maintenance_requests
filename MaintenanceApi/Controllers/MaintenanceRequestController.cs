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

public record MaintenanceRequestResponse(
    int Id,
    string Location,
    string MaintenanceType,
    DateTime CreatedAt,
    int CreatedBy,
    string CreatedByName,
    RequestStatus RequestStatus
);

[ApiController]
[Route("api/[controller]")]
public class MaintenanceRequestController(AppDbContext db) : ControllerBase
{

   
    [HttpGet(Name = "GetMaintenanceRequests")]
    public async Task<ActionResult<IEnumerable<MaintenanceRequestResponse>>> Get()
    {
        return await db.MaintenanceRequests
            .Select(r => new MaintenanceRequestResponse(
                r.Id, r.Location, r.MaintenanceType, r.CreatedAt,
                r.CreatedBy,
                r.Creator!.FirstName + " " + r.Creator.LastName,
                r.RequestStatus))
            .ToListAsync();
    }

    [HttpGet("{id:int}", Name = "GetMaintenanceRequest")]
    public async Task<ActionResult<MaintenanceRequestResponse>> GetById(int id)
    {
        var maintenanceRequest = await db.MaintenanceRequests
                                    .Where(r => r.Id == id)
                                    .Select(r => new MaintenanceRequestResponse(
                                        r.Id, r.Location, r.MaintenanceType, r.CreatedAt,
                                        r.CreatedBy,
                                        r.Creator!.FirstName + " " + r.Creator.LastName,
                                        r.RequestStatus))
                                    .FirstOrDefaultAsync();

        if (maintenanceRequest is null)
        {
            return NotFound();
        }

        return maintenanceRequest;
    }

    [HttpPost("CreateMaintenanceRequest")]
    public async Task<ActionResult<MaintenanceRequestResponse>> Create(CreateMaintenanceRequest request)
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
        var response = await db.MaintenanceRequests
            .Where(r => r.Id == new_request.Id)
            .Select(r => new MaintenanceRequestResponse(
                r.Id, r.Location, r.MaintenanceType, r.CreatedAt,
                r.CreatedBy,
                r.Creator!.FirstName + " " + r.Creator.LastName,
                r.RequestStatus))
            .FirstOrDefaultAsync();

        if (response is null)
        {
            return NotFound();
        }

        return response;

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
