-- Heavy seed set: 100,000 users, 5,000,000 maintenance requests
-- Assumes roles/statuses are seeded (ids 1-3) and users.users is empty.
-- Adjust the two variables below to scale up or down.

SET NOCOUNT ON;

DECLARE @user_count    INT = 100000;
DECLARE @request_count INT = 5000000;
DECLARE @batch_size    INT = 100000;
-- Every seeded user shares this hash (see README for the dev password).
DECLARE @password_hash NVARCHAR(255) = 'AQAAAAIAAYagAAAAECPXbKhDOXl1oY+s+qu+c7TAbvUoDIPzbFBubw8Al5Fd+tIfPgOh8G3ruvN/DHw0ZA==';

------------------------------------------------------------
-- Users: one set-based insert (100k rows is fine in one go)
------------------------------------------------------------
WITH d AS (
	SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) v(n)
),
nums AS (
	SELECT TOP (@user_count)
		ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
	FROM d a CROSS JOIN d b CROSS JOIN d c CROSS JOIN d e CROSS JOIN d f CROSS JOIN d g  -- 1,000,000 available
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
		(5,'Pine Dr'),(6,'Willow Way'),(7,'Ash Blvd'),(8,'Spruce Pl'),(9,'Hickory Ter')
	) v(i, name)
)
INSERT INTO users.users (email, password_hash, first_name, last_name, address, role_id)
SELECT
	CONCAT('user', n.n, '@example.com'),
	@password_hash,
	fn.name,
	ln.name,
	CONCAT(n.n, ' ', s.name),
	CASE
		WHEN n.n % 100 = 0 THEN 3   -- 1% admins
		WHEN n.n % 10  = 0 THEN 2   -- 9% maintenance
		ELSE 1                      -- 90% tenants
	END
FROM nums n
JOIN first_names fn ON fn.i = n.n % 20
JOIN last_names  ln ON ln.i = (n.n / 20) % 20
JOIN streets     s  ON s.i  = (n.n / 400) % 10;

------------------------------------------------------------
-- Requests: batched so each insert commits separately
------------------------------------------------------------
DECLARE @inserted INT = 0;

-- Random draws are materialized here before the join. If the NEWID()
-- expressions stay inline, the optimizer cannot seek on them and turns the
-- users join into a 100k x 100k cross join per batch. Storing them first also
-- guarantees created_by matches the address used in location.
CREATE TABLE #rnd (
	user_id     INT NOT NULL,
	type_i      INT NOT NULL,
	room_i      INT NOT NULL,
	status_roll INT NOT NULL,
	minutes_ago INT NOT NULL
);

WHILE @inserted < @request_count
BEGIN
	DECLARE @this_batch INT =
		CASE WHEN @request_count - @inserted < @batch_size
			THEN @request_count - @inserted
			ELSE @batch_size END;

	TRUNCATE TABLE #rnd;

	WITH d AS (
		SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) v(n)
	),
	nums AS (
		SELECT TOP (@this_batch)
			ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
		FROM d a CROSS JOIN d b CROSS JOIN d c CROSS JOIN d e CROSS JOIN d f CROSS JOIN d g
	)
	INSERT INTO #rnd (user_id, type_i, room_i, status_roll, minutes_ago)
	SELECT
		ABS(CHECKSUM(NEWID()) % @user_count) + 1,   -- modulo before ABS: ABS(INT_MIN) overflows
		ABS(CHECKSUM(NEWID()) % 8),
		ABS(CHECKSUM(NEWID()) % 8),
		ABS(CHECKSUM(NEWID()) % 100),
		ABS(CHECKSUM(NEWID()) % 2628000)            -- ~5 years of minutes
	FROM nums;

	WITH types AS (
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
	)
	INSERT INTO requests.maintenance_requests (location, maintenance_type, created_at, created_by, status_id)
	SELECT
		CONCAT(u.address, ' - ', r.name),
		t.name,
		DATEADD(MINUTE, -x.minutes_ago, SYSUTCDATETIME()),
		x.user_id,
		CASE
			WHEN x.status_roll < 20 THEN 1
			WHEN x.status_roll < 35 THEN 2
			ELSE 3
		END
	FROM #rnd x
	JOIN users.users u ON u.id = x.user_id
	JOIN types t ON t.i = x.type_i
	JOIN rooms r ON r.i = x.room_i;

	SET @inserted += @this_batch;
	RAISERROR('Inserted %d of %d requests', 0, 1, @inserted, @request_count) WITH NOWAIT;
END

DROP TABLE #rnd;
