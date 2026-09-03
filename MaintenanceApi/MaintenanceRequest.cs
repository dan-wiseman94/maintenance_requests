namespace MaintenanceApi;

public class MaintenanceRequest
{
	public int Id { get; set; }
	public string Location { get; set; } = string.Empty;
	public string MaintenanceType { get; set; } = string.Empty;
	public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
	public int CreatedBy { get; set; }
	public int StatusId { get; set; }
}