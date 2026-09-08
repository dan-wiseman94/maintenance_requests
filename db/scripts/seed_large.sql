-- Large seed set: 500 users, 10,000 maintenance requests
-- Generated set-based. Assumes roles/statuses are seeded (ids 1-3)
-- and users.users is empty so identities start at 1.

-- Tally table: 10 x 10 x 10 x 10 = 10,000 rows
WITH d AS (
	SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) v(n)
),
nums AS (
	SELECT ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
	FROM d a CROSS JOIN d b CROSS JOIN d c CROSS JOIN d e
),
first_names AS (
	SELECT i, name FROM (VALUES
		(0,'Alice'),(1,'Ben'),(2,'Chloe'),(3,'Daniel'),(4,'Elena'),
		(5,'Farid'),(6,'Grace'),(7,'Hiro'),(8,'Isabel'),(9,'Jonas'),
		(10,'Kira'),(11,'Liam'),(12,'Maya'),(13,'Noah'),(14,'Olivia'),
		(15,'Priya'),(16,'Quinn'),(17,'Rafael'),(18,'Sofia'),(19,'Tomas')
	) v(i, name)
),
last_names AS (
	SELECT i, name FROM (VALUES
		(0,'Nguyen'),(1,'Carter'),(2,'Ramirez'),(3,'Okafor'),(4,'Petrov'),
		(5,'Haddad'),(6,'Lindqvist'),(7,'Tanaka'),(8,'Moreno'),(9,'Berg'),
		(10,'Kowalski'),(11,'Singh'),(12,'Dubois'),(13,'Rossi'),(14,'Mensah'),
		(15,'Yamamoto'),(16,'Fischer'),(17,'Costa'),(18,'Abdullah'),(19,'Walsh')
	) v(i, name)
),
streets AS (
	SELECT i, name FROM (VALUES
		(0,'Maple St'),(1,'Oak Ave'),(2,'Cedar Ln'),(3,'Birch Rd'),(4,'Elm Ct'),
		(5,'Pine Dr'),(6,'Willow Way'),(7,'Ash Blvd')
	) v(i, name)
)
INSERT INTO users.users (first_name, last_name, address, role_id)
SELECT TOP (500)
	fn.name,
	ln.name,
	CONCAT(n.n, ' ', s.name),
	CASE
		WHEN n.n <= 5   THEN 3   -- 5 admins
		WHEN n.n <= 45  THEN 2   -- 40 maintenance staff
		ELSE 1                   -- 455 tenants
	END
FROM nums n
JOIN first_names fn ON fn.i = n.n % 20
JOIN last_names  ln ON ln.i = (n.n / 20) % 20
JOIN streets     s  ON s.i  = n.n % 8
ORDER BY n.n;

-- Requests: random creator, type, location, status, and a created_at
-- spread over the last ~2 years.
WITH d AS (
	SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) v(n)
),
nums AS (
	SELECT ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
	FROM d a CROSS JOIN d b CROSS JOIN d c CROSS JOIN d e
),
types AS (
	SELECT i, name FROM (VALUES
		(0,'Plumbing'),(1,'Electrical'),(2,'HVAC'),(3,'Appliance'),
		(4,'Structural'),(5,'Landscaping'),(6,'Pest Control'),(7,'Painting')
	) v(i, name)
),
rooms AS (
	SELECT i, name FROM (VALUES
		(0,'Kitchen'),(1,'Bathroom'),(2,'Bedroom'),(3,'Living Room'),
		(4,'Garage'),(5,'Hallway'),(6,'Exterior'),(7,'Basement')
	) v(i, name)
),
rnd AS (
	SELECT
		n.n,
		ABS(CHECKSUM(NEWID()) % 500) + 1  AS user_id,
		ABS(CHECKSUM(NEWID()) % 8)        AS type_i,
		ABS(CHECKSUM(NEWID()) % 8)        AS room_i,
		ABS(CHECKSUM(NEWID()) % 100)      AS status_roll,
		ABS(CHECKSUM(NEWID()) % 1051200)  AS minutes_ago   -- ~2 years
	FROM nums n
)
INSERT INTO requests.maintenance_requests (location, maintenance_type, created_at, created_by, status_id)
SELECT
	CONCAT(u.address, ' - ', r.name),
	t.name,
	DATEADD(MINUTE, -x.minutes_ago, SYSUTCDATETIME()),
	x.user_id,
	CASE
		WHEN x.status_roll < 20 THEN 1   -- 20% open
		WHEN x.status_roll < 35 THEN 2   -- 15% in progress
		ELSE 3                           -- 65% closed
	END
FROM rnd x
JOIN users.users u ON u.id = x.user_id
JOIN types t ON t.i = x.type_i
JOIN rooms r ON r.i = x.room_i;
