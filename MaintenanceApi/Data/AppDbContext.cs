using Microsoft.EntityFrameworkCore;

namespace MaintenanceApi.Data;


public enum RequestStatus
{
    Open = 1,
    InProgress = 2,
    Closed = 3
}

public enum UserRole
{
    Tenant = 1,
    Maintenance = 2,
    Admin = 3
}

public class MaintenanceRequest
{
    public int Id { get; set; }
    public string Location { get; set; } = "";
    public string MaintenanceType { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public int CreatedBy { get; set; }
    public RequestStatus RequestStatus { get; set; }
    public User? Creator {get; set;}
}

public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public UserRole UserRole { get; set; }
}





public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<MaintenanceRequest> MaintenanceRequests => Set<MaintenanceRequest>();
    public DbSet<User> Users => Set<User>();

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
            e.Property(x => x.RequestStatus).HasColumnName("status_id");
            e.HasOne(x => x.Creator)
                .WithMany()
                .HasForeignKey(x => x.CreatedBy);
        });

         mb.Entity<User>(e =>
        {
            e.ToTable("users", "users");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.FirstName).HasColumnName("first_name");
             e.Property(x => x.LastName).HasColumnName("last_name");
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.UserRole).HasColumnName("role_id");
           
        });
    }
}
