CREATE SCHEMA users;
GO

CREATE SCHEMA requests;
GO

CREATE TABLE users.roles (
	id INT PRIMARY KEY,
	name NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE requests.statuses (
	id INT PRIMARY KEY,
	name NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users.users (
	id INT IDENTITY(1,1) PRIMARY KEY,
	first_name NVARCHAR(255) NOT NULL,
	last_name NVARCHAR(255) NOT NULL,
	address NVARCHAR(255) NOT NULL,
	role_id INT NOT NULL,
	CONSTRAINT FK_role FOREIGN KEY (role_id) REFERENCES users.roles(id)
);

CREATE TABLE requests.maintenance_requests (
	id INT IDENTITY(1,1) PRIMARY KEY,
	location NVARCHAR(255) NOT NULL,
	maintenance_type NVARCHAR(255) NOT NULL,
	created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
	created_by INT NOT NULL,
	status_id INT NOT NULL,
	CONSTRAINT FK_creator FOREIGN KEY (created_by) REFERENCES users.users(id),
	CONSTRAINT FK_status FOREIGN KEY (status_id) REFERENCES requests.statuses(id)
);

INSERT INTO users.roles (id, name) VALUES
	(1, 'Tenant'),
	(2, 'Maintenance'),
	(3, 'Admin');

INSERT INTO requests.statuses (id, name) VALUES
	(1, 'Open'),
	(2, 'In Progress'),
	(3, 'Closed');
