IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_maintenance_requests_created_at' AND object_id = OBJECT_ID('requests.maintenance_requests'))
    CREATE INDEX IX_maintenance_requests_created_at
        ON requests.maintenance_requests (created_at);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_maintenance_requests_created_by' AND object_id = OBJECT_ID('requests.maintenance_requests'))
    CREATE INDEX IX_maintenance_requests_created_by
        ON requests.maintenance_requests (created_by);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_maintenance_requests_status_id' AND object_id = OBJECT_ID('requests.maintenance_requests'))
    CREATE INDEX IX_maintenance_requests_status_id
        ON requests.maintenance_requests (status_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_maintenance_requests_maintenance_type' AND object_id = OBJECT_ID('requests.maintenance_requests'))
    CREATE INDEX IX_maintenance_requests_maintenance_type
        ON requests.maintenance_requests (maintenance_type);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_maintenance_requests_location' AND object_id = OBJECT_ID('requests.maintenance_requests'))
    CREATE INDEX IX_maintenance_requests_location
        ON requests.maintenance_requests (location);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_first_name' AND object_id = OBJECT_ID('users.users'))
    CREATE INDEX IX_users_first_name
        ON users.users (first_name);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_address' AND object_id = OBJECT_ID('users.users'))
    CREATE INDEX IX_users_address
        ON users.users (address);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_full_name' AND object_id = OBJECT_ID('users.users'))
    CREATE INDEX IX_users_full_name
        ON users.users (last_name, first_name);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_role' AND object_id = OBJECT_ID('users.users'))
    CREATE INDEX IX_users_role
        ON users.users (role_id, last_name, first_name);
