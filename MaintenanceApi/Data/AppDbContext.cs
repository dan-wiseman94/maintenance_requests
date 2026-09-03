using Microsoft.EntityFrameworkCore;

namespace MaintenanceApi.Data;

public class MaintenanceRequest
{
    public int Id { get; set; }
    public string Location { get; set; } = "";
    public string MaintenanceType { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public int CreatedBy { get; set; }
    public int StatusId { get; set; }
}


public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<MaintenanceRequest> MaintenanceRequests => Set<MaintenanceRequest>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<MaintenanceRequest>(e =>
        {
            e.ToTable("maintenance_requests", "requests");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Location).HasColumnName("location");
            e.Property(x => x.MaintenanceType).HasColumnName("maintenance_type");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").ValueGeneratedOnAdd();
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.Property(x => x.StatusId).HasColumnName("status_id");
        });
    }
}
