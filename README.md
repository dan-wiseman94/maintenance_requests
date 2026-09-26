# maintenance_requests

Small 100% hand-coded project for the purpose of learning and re-learning a full stack setup.

Frontend: Vue.js
Backend: C# .NET
Database: SQL Server
Other: Nginx, Docker compose


Small maintenance request form web-app to demonstrate full-stack proficiency. 

## Dev accounts

The seed scripts create one account per role. All seeded users, including the
100k generated ones, share the same password: `password`.

| Email                     | Role        |
|---------------------------|-------------|
| dev_tenant@email.com      | Tenant      |
| dev_maintenance@email.com | Maintenance |
| dev_admin@email.com       | Admin       |

Sessions are an HttpOnly cookie named `maintenance.session`, valid for 8 hours
of inactivity. Sign out clears it.