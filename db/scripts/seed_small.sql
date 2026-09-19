-- Small seed set: 10 users, 20 maintenance requests
-- Assumes users.roles and requests.statuses are already seeded (ids 1-3)
-- and users.users is empty so identities start at 1.

-- Every seeded user shares this hash (see README for the dev password).
DECLARE @password_hash NVARCHAR(255) = 'AQAAAAIAAYagAAAAECPXbKhDOXl1oY+s+qu+c7TAbvUoDIPzbFBubw8Al5Fd+tIfPgOh8G3ruvN/DHw0ZA==';

INSERT INTO users.users (email, password_hash, first_name, last_name, address, role_id) VALUES
	('alice@example.com', @password_hash, 'Alice',   'Nguyen',    '101 Maple St',      1),
	('ben@example.com', @password_hash, 'Ben',     'Carter',    '102 Maple St',      1),
	('chloe@example.com', @password_hash, 'Chloe',   'Ramirez',   '103 Maple St',      1),
	('daniel@example.com', @password_hash, 'Daniel',  'Okafor',    '104 Maple St',      1),
	('elena@example.com', @password_hash, 'Elena',   'Petrov',    '201 Oak Ave',       1),
	('farid@example.com', @password_hash, 'Farid',   'Haddad',    '202 Oak Ave',       1),
	('grace@example.com', @password_hash, 'Grace',   'Lindqvist', '203 Oak Ave',       1),
	('hiro@example.com', @password_hash, 'Hiro',    'Tanaka',    '300 Cedar Ln',      2),
	('isabel@example.com', @password_hash, 'Isabel',  'Moreno',    '301 Cedar Ln',      2),
	('jonas@example.com', @password_hash, 'Jonas',   'Berg',      '1 Management Way',  3);

INSERT INTO requests.maintenance_requests (location, maintenance_type, created_at, created_by, status_id) VALUES
	('101 Maple St - Kitchen',      'Plumbing',     '2026-08-01 09:15:00', 1, 3),
	('101 Maple St - Bathroom',     'Plumbing',     '2026-08-03 14:20:00', 1, 3),
	('102 Maple St - Living Room',  'Electrical',   '2026-08-04 08:05:00', 2, 3),
	('102 Maple St - Bedroom',      'HVAC',         '2026-08-06 17:45:00', 2, 2),
	('103 Maple St - Garage',       'Structural',   '2026-08-07 11:30:00', 3, 3),
	('103 Maple St - Kitchen',      'Appliance',    '2026-08-09 10:00:00', 3, 2),
	('104 Maple St - Bathroom',     'Plumbing',     '2026-08-10 07:50:00', 4, 3),
	('104 Maple St - Exterior',     'Landscaping',  '2026-08-12 15:10:00', 4, 1),
	('201 Oak Ave - Hallway',       'Electrical',   '2026-08-13 12:40:00', 5, 2),
	('201 Oak Ave - Bedroom',       'Pest Control', '2026-08-15 09:00:00', 5, 1),
	('202 Oak Ave - Kitchen',       'Appliance',    '2026-08-16 16:25:00', 6, 3),
	('202 Oak Ave - Bathroom',      'Plumbing',     '2026-08-18 08:15:00', 6, 1),
	('203 Oak Ave - Living Room',   'HVAC',         '2026-08-19 13:55:00', 7, 2),
	('203 Oak Ave - Exterior',      'Structural',   '2026-08-21 10:35:00', 7, 1),
	('101 Maple St - Exterior',     'Landscaping',  '2026-08-22 11:05:00', 1, 1),
	('102 Maple St - Garage',       'Electrical',   '2026-08-24 09:45:00', 2, 1),
	('103 Maple St - Bathroom',     'Plumbing',     '2026-08-25 14:00:00', 3, 1),
	('104 Maple St - Kitchen',      'Appliance',    '2026-08-27 08:30:00', 4, 2),
	('201 Oak Ave - Exterior',      'Pest Control', '2026-08-29 15:20:00', 5, 1),
	('202 Oak Ave - Living Room',   'HVAC',         '2026-08-31 12:10:00', 6, 1);
