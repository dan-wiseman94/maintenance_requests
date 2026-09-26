# Auth Work Order

**Finish authentication: cookie sessions, roles, and a locked-down API**

Work order for `maintenance_requests`, written 2026-09-19. Interactive copy with tickable tasks: https://claude.ai/artifact/Uwj1VzJVvbn55j17hUTx2H

A phase-by-phase plan to take the half-built login pieces already in the repo and turn them into a working sign-in, role-aware UI, and an API that refuses what it should. Each phase leaves the app runnable.

- **Stack:** ASP.NET Core 10 · EF Core 10 · SQL Server 2022 · Vue 3.5 · Vue Router 5 · Pinia 4 · Vitest 4
- **Approach:** Cookie auth, hand-rolled, no ASP.NET Identity
- **Roles:** Tenant · Maintenance · Admin (already in `users.roles`)
- **New packages:** API: none · Tests: Mvc.Testing · Frontend: none

## Punch list

- [ ] [TASK 0.1: Give users a response shape that never includes the hash](#task-01-give-users-a-response-shape-that-never-includes-the-hash)
- [ ] [TASK 0.2: Teach the client about email and password](#task-02-teach-the-client-about-email-and-password)
- [ ] [TASK 1.1: Register cookie authentication](#task-11-register-cookie-authentication)
- [ ] [TASK 1.2: Turn a User into a principal, and read it back](#task-12-turn-a-user-into-a-principal-and-read-it-back)
- [ ] [TASK 1.3: AuthController: login, logout, me](#task-13-authcontroller-login-logout-me)
- [ ] [TASK 1.4: Integration test harness and the login tests](#task-14-integration-test-harness-and-the-login-tests)
- [ ] [TASK 2.1: Protect maintenance requests and take the creator from the session](#task-21-protect-maintenance-requests-and-take-the-creator-from-the-session)
- [ ] [TASK 2.2: Make user management admin-only](#task-22-make-user-management-admin-only)
- [ ] [TASK 3.1: The auth store](#task-31-the-auth-store)
- [ ] [TASK 3.2: Login page](#task-32-login-page)
- [ ] [TASK 3.3: Route guard and route metadata](#task-33-route-guard-and-route-metadata)
- [ ] [TASK 3.4: Navigation that knows who you are](#task-34-navigation-that-knows-who-you-are)
- [ ] [TASK 3.5: Send expired sessions back to login](#task-35-send-expired-sessions-back-to-login)
- [ ] [TASK 4.1: Table shows action columns only when told to](#task-41-table-shows-action-columns-only-when-told-to)
- [ ] [TASK 4.2: Creator picker for admins only](#task-42-creator-picker-for-admins-only)
- [ ] [TASK 5.1: Persist Data Protection keys across container restarts](#task-51-persist-data-protection-keys-across-container-restarts)
- [ ] [TASK 5.2: Write the dev accounts into the README](#task-52-write-the-dev-accounts-into-the-readme)
- [ ] [TASK 5.3: Production notes: TLS, forwarded headers, Secure cookie](#task-53-production-notes-tls-forwarded-headers-secure-cookie)
- [ ] [TASK 5.4 · optional: Change your own password](#task-54--optional-change-your-own-password)
- [ ] [TASK 5.5 · optional: Slow down password guessing](#task-55--optional-slow-down-password-guessing)

## Where things stand

Read from the code on 2026-09-19, including the uncommitted working tree. The last commit (`46e4c3c`) added email and password hashing to the API but the client never caught up, so two things are broken right now, independent of auth.

### Already in place

- `users.users` has `email` (unique) and `password_hash`; `User` is mapped to both in `AppDbContext`.
- `IPasswordHasher<User>` is registered in `Program.cs` and used by `UserController.Create`. This is the ASP.NET Core Identity hasher (PBKDF2, version 3 format) without the rest of Identity. Keep it.
- Three dev accounts are seeded by `dev_accounts.sql` (`dev_tenant@`, `dev_maintenance@`, `dev_admin@email.com`), all sharing one hash. Every one of the 100k seeded users shares it too.
- `app.UseAuthorization()` is in the pipeline with no authentication scheme registered and no `[Authorize]` anywhere, so it does nothing yet.
- Pinia is installed and mounted in `main.ts`, but there are no stores. The router has three routes, no guards, and a `/` placeholder.
- `Table.vue` carries the note *"make only available to Admin users (needs login system)"* above its Edit and Delete columns.
- Vite proxies `/api` to the API container, so the browser sees one origin. That is what makes a plain session cookie the easy choice.

### Broken or unsafe today

| Where | What | Status |
|----|----|----|
| `CreateUserModal.vue` | Posts no `email` or `passwordHash`, but `CreateUserRequest` marks both `[Required]`. Every create from the UI is a 400 and a "Failed to create user" toast. | **Broken** |
| `UserController` GET endpoints | Return the `User` entity as-is, so every list and lookup ships `passwordHash` to the browser. The inline edit in `Table.vue` then PUTs it straight back. | **Leaks** |
| `CreateUserRequest.PasswordHash` | Is actually the plaintext password (the controller hashes it). The name will mislead you in three months. | **Confusing** |
| `UserController.Update` | Takes `CreateUserRequest`, so callers must send a password to change an address. It then ignores it. | **Wrong shape** |
| `seed_heavy.sql` | Says "see README for the dev password". The README does not have it. | **Doc gap** |
| `MaintenanceRequestController.Create` | `CreatedBy` is whatever the client says. Once there is a signed-in user this must come from the session. | **Auth gap** |

## Decisions

These are the calls I made from the codebase so the plan can be concrete. Each names the alternative and when you would pick it instead. Change any of them and the affected tasks change shape, but the phase order holds.

### Cookie sessions, not JWT

The SPA and API share an origin through the Vite proxy (and will through Nginx). An `HttpOnly` cookie means no token in JavaScript, no `localStorage`, no refresh-token dance, and no signing secret in `.env`. ASP.NET Core 10 returns 401/403 for `[ApiController]` endpoints under cookie auth instead of redirecting, so it needs no event overrides.

Pick JWT instead if a native mobile app or a third party will call the API from another origin.

### Hand-rolled, no ASP.NET Identity

Identity wants its own tables (`AspNetUsers`, `AspNetRoles`, …) and a `UserManager` that hides the mechanics. You already have a users table, a roles table, and the hasher. Building the cookie by hand means you see every moving part: verify, claims, principal, sign-in.

Pick Identity if you later need lockout, 2FA, external logins, or email confirmation out of the box.

### Roles travel as claims

At login the `UserRole` enum name goes into a `ClaimTypes.Role` claim. That lets `[Authorize(Roles = "Admin")]` work with zero extra plumbing. The user id, email, and display name ride along too, so most requests never touch the users table.

Role names are matched case-sensitively. `UserRole.Admin.ToString()` is `"Admin"`, so keep the attribute strings identical.

### CSRF: SameSite=Strict + JSON only

A `SameSite=Strict` cookie is never sent on a cross-site request, and every mutating endpoint only accepts `application/json`, which an HTML form cannot produce. Together that closes classic CSRF without an antiforgery token round-trip.

Add ASP.NET's antiforgery middleware later if you ever relax SameSite or accept form posts.

### Admins create accounts, no self-signup

This is a landlord's tool. Tenants get an account from the office. So `POST /api/user` stays admin-only and there is no registration page. Password change for yourself is an optional task in Phase 5.

A registration flow is a small follow-up: an anonymous endpoint that forces `UserRole.Tenant`.

### Integration tests for auth, unit tests for the rest

Cookie issuance, `[Authorize]`, and role checks live in middleware, which the existing "new up the controller" tests never run. Add `Microsoft.AspNetCore.Mvc.Testing` and drive the real pipeline over HTTP with an in-memory database. The existing `UserControllerTests` keep working unchanged.

Mocking `IAuthenticationService` per controller test works but tests less and costs more code.

## Access matrix

What each role may do once Phase 2 lands. The API enforces all of it; the UI merely hides what a role cannot do (Phase 4).

| Endpoint | Anonymous | Tenant | Maintenance | Admin | Note |
|----|----|----|----|----|----|
| `POST /api/auth/login` | ✔ | ✔ | ✔ | ✔ | Sets the cookie, returns the user. |
| `POST /api/auth/logout` | 401 | ✔ | ✔ | ✔ | Clears the cookie. |
| `GET /api/auth/me` | 401 | ✔ | ✔ | ✔ | The SPA calls this on boot. |
| `GET /api/maintenancerequest` (+`/{id}`) | 401 | ✔ | ✔ | ✔ | Tenant sees all rows for now; own-rows-only is a "later" item. |
| `POST …/CreateMaintenanceRequest` | 401 | ✔ as self | ✔ as self | ✔ any creator | `createdBy` is optional and honoured only for Admin. |
| `PUT /api/maintenancerequest/{id}` | 401 | 403 | ✔ | ✔ | Status changes are the maintenance team's job. |
| `DELETE /api/maintenancerequest/{id}` | 401 | 403 | 403 | ✔ |  |
| `/api/user/*` (all verbs) | 401 | 403 | 403 | ✔ | Includes the role search the request modal uses; the modal only calls it for admins. |

## Phase 0: Stop the bleeding

Fix the two live problems from the last commit before adding anything. After this phase the app works end-to-end again, nothing leaks hashes, and the DTO shapes are the ones auth will build on.

### TASK 0.1: Give users a response shape that never includes the hash

- **modify** MaintenanceApi/Controllers/UserController.cs
- **keep** MaintenanceApi.Tests/UserControllerTests.cs (still passes)

Add three records next to the controller. `UserResponse` is what every endpoint returns from now on, including `/api/auth/me` in Phase 1. Rename the plaintext field to what it is.

*MaintenanceApi/Controllers/UserController.cs*

``` csharp
public record UserResponse(
    int Id,
    string Email,
    string FirstName,
    string LastName,
    string Address,
    UserRole UserRole)
{
    public static UserResponse From(User u) =>
        new(u.Id, u.Email, u.FirstName, u.LastName, u.Address, u.UserRole);
}

public record CreateUserRequest(
    [Required, MaxLength(255)] string FirstName,
    [Required, MaxLength(255)] string LastName,
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MinLength(8), MaxLength(128)] string Password,
    [Required, MaxLength(255)] string Address,
    [Required] UserRole UserRole
);

public record UpdateUserRequest(
    [Required, MaxLength(255)] string FirstName,
    [Required, MaxLength(255)] string LastName,
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MaxLength(255)] string Address,
    [Required] UserRole UserRole
);
```

Then change the endpoints. The list and role endpoints project inside the query so SQL Server never even reads `password_hash`; the single-row endpoints call `From` after `FindAsync`. Emails are normalised on the way in so login can compare them exactly.

*MaintenanceApi/Controllers/UserController.cs (changed members)*

``` csharp
private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

// Get: same paging and ordering as today, then project.
var projected = query.Select(u => new UserResponse(
    u.Id, u.Email, u.FirstName, u.LastName, u.Address, u.UserRole));
var totalCount = await projected.CountAsync();
var items = await projected.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
return new PagedResult<UserResponse>(items, page, pageSize, totalCount);

// GetById
var user = await db.Users.FindAsync(id);
if (user is null) return NotFound();
return UserResponse.From(user);

// GetByRole: replace .ToListAsync() with
var users = await query
    .OrderBy(r => r.LastName).ThenBy(r => r.FirstName)
    .Take(limit)
    .Select(u => new UserResponse(u.Id, u.Email, u.FirstName, u.LastName, u.Address, u.UserRole))
    .ToListAsync();

// Create
var email = NormalizeEmail(request.Email);
if (await db.Users.AnyAsync(u => u.Email == email))
    return Conflict(new { message = "An account with that email already exists." });

var user = new User
{
    FirstName = request.FirstName, LastName = request.LastName,
    Email = email, Address = request.Address, UserRole = request.UserRole,
};
user.PasswordHash = hasher.HashPassword(user, request.Password);
db.Users.Add(user);
await db.SaveChangesAsync();
return CreatedAtRoute("GetUser", new { id = user.Id }, UserResponse.From(user));

// Update: signature becomes (int id, UpdateUserRequest request)
var email = NormalizeEmail(request.Email);
if (await db.Users.AnyAsync(u => u.Email == email && u.Id != id))
    return Conflict(new { message = "An account with that email already exists." });
user.FirstName = request.FirstName;
user.LastName = request.LastName;
user.Email = email;
user.Address = request.Address;
user.UserRole = request.UserRole;
```

Update the return types to match: `ActionResult<PagedResult<UserResponse>>`, `ActionResult<UserResponse>`, `ActionResult<IEnumerable<UserResponse>>`. The existing `GetById` test reads `result.Value!.FirstName`, which still exists on the new record, so it passes untouched.

> **Why the pre-check instead of catching the unique-index error.** The database enforces uniqueness (`email NVARCHAR(255) UNIQUE`), but the EF in-memory provider your tests use does not. An explicit `AnyAsync` gives the same 409 in both places. It is racy under concurrent creates of the same email; the index catches that case with a `DbUpdateException`, which surfaces as a 500. Acceptable here.

#### Tests to add

*MaintenanceApi.Tests/UserControllerTests.cs*

``` csharp
[Fact]
public async Task Create_HashesPassword_AndNeverReturnsIt()
{
    using var db = NewDb();
    var controller = NewController(db);
    var request = new CreateUserRequest("Ada", "Wong", "Ada@Example.com", "correct-horse", "1 Main St", UserRole.Tenant);

    var result = await controller.Create(request);

    var created = Assert.IsType<CreatedAtRouteResult>(result.Result);
    var body = Assert.IsType<UserResponse>(created.Value);
    Assert.Equal("ada@example.com", body.Email);                       // normalised
    var stored = await db.Users.SingleAsync();
    Assert.NotEqual("correct-horse", stored.PasswordHash);             // hashed
    Assert.Equal(PasswordVerificationResult.Success,
        new PasswordHasher<User>().VerifyHashedPassword(stored, stored.PasswordHash, "correct-horse"));
}

[Fact]
public async Task Create_ReturnsConflict_WhenEmailTaken()
{
    using var db = NewDb();
    db.Users.Add(new User { Id = 1, Email = "taken@example.com", FirstName = "A", LastName = "B", Address = "x", UserRole = UserRole.Tenant });
    await db.SaveChangesAsync();
    var controller = NewController(db);

    var result = await controller.Create(new CreateUserRequest("C", "D", "TAKEN@example.com", "password123", "y", UserRole.Tenant));

    Assert.IsType<ConflictObjectResult>(result.Result);
}
```

#### Verify

``` sh
dotnet test MaintenanceApi.Tests            # all green, including the two new facts
docker compose up -d
curl -s http://localhost:5000/api/user/1 | grep -c passwordHash   # expect 0
```

**Commit:** `refactor(api): return UserResponse from user endpoints, split create/update DTOs`

### TASK 0.2: Teach the client about email and password

- **modify** maintenance_request/src/types.ts
- **modify** maintenance_request/src/components/CreateUserModal.vue
- **modify** maintenance_request/src/views/UsersView.vue
- **modify** maintenance_request/src/\_\_tests\_\_/CreateUserModal.spec.ts, UsersView.spec.ts

*src/types.ts*

``` ts
export type UserRole = 'Tenant' | 'Maintenance' | 'Admin'

export type User = {
  id: number
  email: string
  firstName: string
  lastName: string
  address: string
  userRole: UserRole
}
```

In `CreateUserModal.vue` the draft type becomes `Omit<User, 'id'> & { password: string }`, `emptyUser()` gains `email: ''` and `password: ''`, and the form gets two inputs between last name and address:

*src/components/CreateUserModal.vue (template additions)*

```
<label for="create-user-email">Email</label>
<input id="create-user-email" v-model.trim="draft.email" type="email" autocomplete="off" required maxlength="255" />

<label for="create-user-password">Temporary password</label>
<input id="create-user-password" v-model="draft.password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" />
```

Add `{ key: 'email', label: 'Email' }` to `userColumns` in `UsersView.vue` so admins can see who is who; the API already accepts `orderBy=email` once you add a case for it in the `switch` (one line, mirrors `firstName`).

#### Tests to update

- `CreateUserModal.spec.ts`: `fillForm` sets `#create-user-email` to `ada@example.com` and `#create-user-password` to `correct-horse`; the expected POST body gains both keys; the `created` fixture gains `email`.
- `UsersView.spec.ts` and `fixtures/maintenanceRequests.ts`: every `User` literal gains an `email`, or `pnpm type-check` fails.

#### Verify

``` sh
cd maintenance_request
pnpm test:unit --run
pnpm type-check
# then in the browser: Create New User with an email and password succeeds and the row appears
```

**Commit:** `fix(web): send email and password when creating a user`

## Phase 1: Sessions on the API

Register the cookie scheme, build a principal from a `User`, and add three endpoints: login, logout, me. Nothing is protected yet, so the frontend keeps working while you build. Ends with an integration test harness that the rest of the plan reuses.

### TASK 1.1: Register cookie authentication

- **modify** MaintenanceApi/Program.cs

The cookie handler ships in the shared framework, so there is no package to add. Note the order at the bottom: `UseAuthentication` must run before `UseAuthorization`, and both after routing (implicit with `WebApplication`).

*MaintenanceApi/Program.cs*

``` csharp
using Microsoft.AspNetCore.Authentication.Cookies;
// ...existing usings

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "maintenance.session";
        options.Cookie.HttpOnly = true;               // JS can never read it
        options.Cookie.SameSite = SameSiteMode.Strict; // never sent cross-site
        // Dev runs over plain http behind the Vite proxy. "Always" would mean the
        // browser silently drops the cookie and every login looks like it failed.
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;              // active users stay signed in
    });
builder.Services.AddAuthorization();

// ...

app.UseHttpsRedirection();
app.UseAuthentication();   // NEW, and before UseAuthorization
app.UseAuthorization();
app.MapControllers();
app.Run();

// Lets MaintenanceApi.Tests host the app through WebApplicationFactory<Program>.
public partial class Program { }
```

> **What the cookie actually holds.** Not a session id. ASP.NET serialises the whole `ClaimsPrincipal` plus expiry into an authentication ticket, encrypts and signs it with Data Protection, and that ciphertext is the cookie. So there is no server-side session table, and losing the Data Protection keys (a fresh container without a key volume, see Gotchas) simply invalidates every cookie. The user logs in again; nothing else breaks.

#### Verify

``` sh
dotnet build MaintenanceApi
curl -i http://localhost:5000/api/user?pageSize=1 | head -1   # still 200; nothing is protected yet
```

**Commit:** `feat(api): register cookie authentication scheme`

### TASK 1.2: Turn a User into a principal, and read it back

- **create** MaintenanceApi/Auth/UserClaims.cs

One file, two directions: `ToPrincipal` at login, and two extension methods for reading the signed-in user inside controllers, where `User` is the `ClaimsPrincipal` property on `ControllerBase`.

*MaintenanceApi/Auth/UserClaims.cs*

``` csharp
using System.Security.Claims;
using MaintenanceApi.Data;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace MaintenanceApi.Auth;

public static class UserClaims
{
    public static ClaimsPrincipal ToPrincipal(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new(ClaimTypes.Role, user.UserRole.ToString()),   // "Tenant" | "Maintenance" | "Admin"
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }
}

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(raw, out var id)
            ? id
            : throw new InvalidOperationException("Signed-in principal has no user id claim.");
    }

    public static bool IsInRole(this ClaimsPrincipal principal, UserRole role)
        => principal.IsInRole(role.ToString());
}
```

> **Why the identity needs an authentication type.** `ClaimsIdentity.IsAuthenticated` is true only when `AuthenticationType` is non-null. Construct it with the scheme name, or `[Authorize]` will treat a perfectly good cookie as anonymous and you will chase a 401 for an hour.

#### Tests to add

*MaintenanceApi.Tests/UserClaimsTests.cs*

``` csharp
using System.Security.Claims;
using MaintenanceApi.Auth;
using MaintenanceApi.Data;

namespace MaintenanceApi.Tests;

public class UserClaimsTests
{
    private static readonly User Sample = new()
    {
        Id = 42, Email = "ada@example.com", FirstName = "Ada", LastName = "Wong", UserRole = UserRole.Maintenance,
    };

    [Fact]
    public void ToPrincipal_IsAuthenticated_AndCarriesIdNameRole()
    {
        var principal = UserClaims.ToPrincipal(Sample);

        Assert.True(principal.Identity!.IsAuthenticated);
        Assert.Equal(42, principal.GetUserId());
        Assert.Equal("Ada Wong", principal.Identity.Name);
        Assert.True(principal.IsInRole(UserRole.Maintenance));
        Assert.False(principal.IsInRole(UserRole.Admin));
    }

    [Fact]
    public void GetUserId_Throws_WhenClaimMissing()
    {
        var anonymous = new ClaimsPrincipal(new ClaimsIdentity());
        Assert.Throws<InvalidOperationException>(() => anonymous.GetUserId());
    }
}
```

#### Verify

``` sh
dotnet test MaintenanceApi.Tests --filter UserClaimsTests
```

**Commit:** `feat(api): build ClaimsPrincipal from User and add claim accessors`

### TASK 1.3: AuthController: login, logout, me

- **create** MaintenanceApi/Controllers/AuthController.cs
- **modify** MaintenanceApi/MaintenanceApi.http

*MaintenanceApi/Controllers/AuthController.cs*

``` csharp
using System.ComponentModel.DataAnnotations;
using MaintenanceApi.Auth;
using MaintenanceApi.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceApi.Controllers;

public record LoginRequest(
    [Required, EmailAddress, MaxLength(255)] string Email,
    [Required, MaxLength(128)] string Password);

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IPasswordHasher<User> hasher) : ControllerBase
{
    // A real hash of a random string, computed once per process. Verifying an
    // unknown email against it keeps that path as slow as a wrong password, so
    // response time does not reveal which emails exist.
    private static readonly string DummyHash =
        new PasswordHasher<User>().HashPassword(new User(), Guid.NewGuid().ToString());

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponse>> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);

        var result = hasher.VerifyHashedPassword(user ?? new User(), user?.PasswordHash ?? DummyHash, request.Password);
        if (user is null || result == PasswordVerificationResult.Failed)
        {
            // Deliberately the same message for both failure modes.
            return Unauthorized(new { message = "Email or password is incorrect." });
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            // The hasher's work factor went up since this hash was made; upgrade it while we have the plaintext.
            user.PasswordHash = hasher.HashPassword(user, request.Password);
            await db.SaveChangesAsync();
        }

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, UserClaims.ToPrincipal(user));
        return UserResponse.From(user);
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var user = await db.Users.FindAsync(User.GetUserId());
        if (user is null)
        {
            // Account deleted after the cookie was issued: kill the cookie too.
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Unauthorized();
        }
        return UserResponse.From(user);
    }
}
```

> **Two names called User.** Inside a controller, `User` in an expression is `ControllerBase.User`, the `ClaimsPrincipal`. After `new` or inside generics like `IPasswordHasher<User>` the compiler is looking for a type, so it finds `MaintenanceApi.Data.User`. That is why `new User()` and `User.GetUserId()` can sit in the same method. `UserController` already relies on this.

Add these to the top of `MaintenanceApi.http`. VS Code's REST Client keeps cookies between requests by default, so the second request is authenticated after the first runs.

*MaintenanceApi/MaintenanceApi.http*

```
### Login as the dev admin (expect 200 + Set-Cookie: maintenance.session=...)
POST {{MaintenanceApi_HostAddress}}/api/auth/login
Content-Type: application/json

{ "email": "dev_admin@email.com", "password": "<the dev password>" }

### Who am I (expect 200 after login, 401 before)
GET {{MaintenanceApi_HostAddress}}/api/auth/me

### Wrong password (expect 401, same message as unknown email)
POST {{MaintenanceApi_HostAddress}}/api/auth/login
Content-Type: application/json

{ "email": "dev_admin@email.com", "password": "nope" }

### Logout (expect 204)
POST {{MaintenanceApi_HostAddress}}/api/auth/logout
```

#### Verify with curl (a cookie jar stands in for the browser)

``` sh
curl -i -c /tmp/jar -H 'Content-Type: application/json' \
  -d '{"email":"dev_admin@email.com","password":"<dev password>"}' \
  http://localhost:5000/api/auth/login          # 200, Set-Cookie: maintenance.session=...; httponly; samesite=strict
curl -i -b /tmp/jar http://localhost:5000/api/auth/me     # 200 with the admin's UserResponse
curl -i http://localhost:5000/api/auth/me                 # 401, not 302
```

**Commit:** `feat(api): add login, logout and me endpoints`

### TASK 1.4: Integration test harness and the login tests

- **modify** MaintenanceApi.Tests/MaintenanceApi.Tests.csproj
- **create** MaintenanceApi.Tests/ApiFactory.cs
- **create** MaintenanceApi.Tests/AuthTests.cs
- **delete** MaintenanceApi.Tests/UnitTest1.cs (the empty template test)

*MaintenanceApi.Tests/MaintenanceApi.Tests.csproj (add to the PackageReference group)*

``` xml
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.11" />
```

The factory boots the real `Program`, then swaps SQL Server for the in-memory provider. Since EF Core 9 the thing to remove is `IDbContextOptionsConfiguration<T>`; removing only `DbContextOptions<T>` leaves both providers registered and EF throws at first use.

*MaintenanceApi.Tests/ApiFactory.cs*

``` csharp
using System.Text.Json;
using System.Text.Json.Serialization;
using MaintenanceApi.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace MaintenanceApi.Tests;

public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    // The API writes enums as strings; the client must read them the same way.
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public const string Password = "correct-horse-battery";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(_dbName));
        });
    }

    /// One user per role, ids 1..3, all with the same password. Idempotent.
    public void SeedRoles()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (db.Users.Any()) return;

        var hasher = new PasswordHasher<User>();
        foreach (var (id, role) in new[] { (1, UserRole.Tenant), (2, UserRole.Maintenance), (3, UserRole.Admin) })
        {
            var user = new User
            {
                Id = id, Email = $"{role.ToString().ToLowerInvariant()}@test.local",
                FirstName = role.ToString(), LastName = "User", Address = $"{id} Test St", UserRole = role,
            };
            user.PasswordHash = hasher.HashPassword(user, Password);
            db.Users.Add(user);
        }
        db.SaveChanges();
    }

    /// A client that has already logged in as the given role. CreateClient()
    /// handles cookies by default, so the session cookie rides on later calls.
    public async Task<HttpClient> ClientAs(UserRole role)
    {
        SeedRoles();
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login",
            new { email = $"{role.ToString().ToLowerInvariant()}@test.local", password = Password });
        response.EnsureSuccessStatusCode();
        return client;
    }
}
```

*MaintenanceApi.Tests/AuthTests.cs*

``` csharp
using System.Net;
using System.Net.Http.Json;
using MaintenanceApi.Controllers;
using MaintenanceApi.Data;

namespace MaintenanceApi.Tests;

public class AuthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Login_WithValidCredentials_SetsCookie_AndReturnsUser()
    {
        factory.SeedRoles();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new { email = "ADMIN@test.local", password = ApiFactory.Password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith("maintenance.session=", cookie);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);

        var body = await response.Content.ReadFromJsonAsync<UserResponse>(ApiFactory.Json);
        Assert.Equal("admin@test.local", body!.Email);
        Assert.Equal(UserRole.Admin, body.UserRole);
    }

    [Theory]
    [InlineData("admin@test.local", "wrong-password")]
    [InlineData("nobody@test.local", ApiFactory.Password)]
    public async Task Login_WithBadCredentials_Returns401_WithoutCookie(string email, string password)
    {
        factory.SeedRoles();
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task Me_WithoutCookie_Returns401_NotRedirect()
    {
        var response = await factory.CreateClient().GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_AfterLogin_ReturnsSignedInUser()
    {
        var client = await factory.ClientAs(UserRole.Tenant);

        var me = await client.GetFromJsonAsync<UserResponse>("/api/auth/me", ApiFactory.Json);

        Assert.Equal(1, me!.Id);
        Assert.Equal(UserRole.Tenant, me.UserRole);
    }

    [Fact]
    public async Task Logout_EndsTheSession()
    {
        var client = await factory.ClientAs(UserRole.Tenant);

        var logout = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }
}
```

> **In-memory provider caveats.**
>
> It ignores the unique index on `email`, ignores column lengths, and compares strings case-sensitively where SQL Server's default collation does not. The email normalisation from Task 0.1 makes the tests and production agree. It also has no `SYSUTCDATETIME()` default, so `CreatedAt` stays `default(DateTime)` in tests unless you set it; set it in the controller if a test ever cares.

#### Verify

``` sh
dotnet test MaintenanceApi.Tests           # AuthTests: 6 facts green (the Theory counts twice)
```

**Commit:** `test(api): add WebApplicationFactory harness and auth endpoint tests`

## Phase 2: Lock the doors

Apply the access matrix. From here the frontend is broken until Phase 3 lands (every data call returns 401), so do Phases 2 and 3 in one sitting, or keep this phase on a branch until the login page exists.

### TASK 2.1: Protect maintenance requests and take the creator from the session

- **modify** MaintenanceApi/Controllers/MaintenanceRequestController.cs
- **create** MaintenanceApi.Tests/MaintenanceRequestAuthTests.cs

*MaintenanceApi/Controllers/MaintenanceRequestController.cs*

``` csharp
using MaintenanceApi.Auth;
using Microsoft.AspNetCore.Authorization;

public record CreateMaintenanceRequest(
    [Required, MaxLength(255)] string Location,
    [Required, MaxLength(255)] string MaintenanceType,
    [Range(1, int.MaxValue)] int? CreatedBy,        // now optional
    [Required] RequestStatus RequestStatus
);

[ApiController]
[Route("api/[controller]")]
[Authorize]                                          // everything here needs a session
public class MaintenanceRequestController(AppDbContext db) : ControllerBase
{
    // Get, GetById: unchanged.

    [HttpPost("CreateMaintenanceRequest")]
    public async Task<ActionResult<MaintenanceRequestResponse>> Create(CreateMaintenanceRequest request)
    {
        // Only an admin may file on someone else's behalf; everyone else is the creator.
        var creatorId = request.CreatedBy is int requested && User.IsInRole(UserRole.Admin)
            ? requested
            : User.GetUserId();

        var new_request = new MaintenanceRequest
        {
            Location = request.Location,
            MaintenanceType = request.MaintenanceType,
            CreatedBy = creatorId,
            RequestStatus = request.RequestStatus
        };
        // ...rest unchanged
    }

    [HttpPut("{id:int}", Name = "UpdateMainteanceRequest")]
    [Authorize(Roles = "Maintenance,Admin")]
    public async Task<ActionResult<MaintenanceRequest>> Update(int id, CreateMaintenanceRequest request)
    {
        // ...unchanged, except: only overwrite CreatedBy when one was sent
        if (request.CreatedBy is int createdBy) maintenance_request.CreatedBy = createdBy;
    }

    [HttpDelete("{id:int}", Name = "DeleteMaintenanceRequest")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id) { /* unchanged */ }
}
```

> **Class-level Authorize plus method-level Roles.** Attributes stack. The class says "must be signed in"; the method says "and must hold one of these roles". A request that fails the first gets 401 (challenge), one that fails the second gets 403 (forbid). Comma-separated roles are OR'd. Write them without spaces; the framework trims, but consistency saves squinting.

*MaintenanceApi.Tests/MaintenanceRequestAuthTests.cs*

``` csharp
using System.Net;
using System.Net.Http.Json;
using MaintenanceApi.Controllers;
using MaintenanceApi.Data;

namespace MaintenanceApi.Tests;

public class MaintenanceRequestAuthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static object NewRequest(int? createdBy = null) => new
    {
        location = "12 Test St - Kitchen", maintenanceType = "Plumbing", createdBy, requestStatus = "Open",
    };

    [Fact]
    public async Task List_WithoutSession_Returns401()
    {
        var response = await factory.CreateClient().GetAsync("/api/maintenancerequest");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsTenant_IgnoresSuppliedCreatedBy()
    {
        var client = await factory.ClientAs(UserRole.Tenant);      // id 1

        var response = await client.PostAsJsonAsync("/api/maintenancerequest/CreateMaintenanceRequest", NewRequest(createdBy: 3));
        var body = await response.Content.ReadFromJsonAsync<MaintenanceRequestResponse>(ApiFactory.Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, body!.CreatedBy);
    }

    [Fact]
    public async Task Create_AsAdmin_HonoursSuppliedCreatedBy()
    {
        var client = await factory.ClientAs(UserRole.Admin);       // id 3

        var response = await client.PostAsJsonAsync("/api/maintenancerequest/CreateMaintenanceRequest", NewRequest(createdBy: 1));
        var body = await response.Content.ReadFromJsonAsync<MaintenanceRequestResponse>(ApiFactory.Json);

        Assert.Equal(1, body!.CreatedBy);
    }

    [Theory]
    [InlineData(UserRole.Tenant, HttpStatusCode.Forbidden)]
    [InlineData(UserRole.Maintenance, HttpStatusCode.Forbidden)]
    [InlineData(UserRole.Admin, HttpStatusCode.NotFound)]        // past the gate; 9999 does not exist
    public async Task Delete_IsAdminOnly(UserRole role, HttpStatusCode expected)
    {
        var client = await factory.ClientAs(role);
        var response = await client.DeleteAsync("/api/maintenancerequest/9999");
        Assert.Equal(expected, response.StatusCode);
    }

    [Fact]
    public async Task Update_AsTenant_Returns403()
    {
        var client = await factory.ClientAs(UserRole.Tenant);
        var response = await client.PutAsJsonAsync("/api/maintenancerequest/9999", NewRequest());
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
```

#### Verify

``` sh
dotnet test MaintenanceApi.Tests --filter MaintenanceRequestAuthTests
curl -i http://localhost:5000/api/maintenancerequest | head -1     # HTTP/1.1 401
```

**Commit:** `feat(api): require a session for maintenance requests; derive creator from claims`

### TASK 2.2: Make user management admin-only

- **modify** MaintenanceApi/Controllers/UserController.cs
- **create** MaintenanceApi.Tests/UserAuthTests.cs

*MaintenanceApi/Controllers/UserController.cs*

``` csharp
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UserController(AppDbContext db, IPasswordHasher<User> hasher) : ControllerBase
```

*MaintenanceApi.Tests/UserAuthTests.cs*

``` csharp
using System.Net;
using MaintenanceApi.Data;

namespace MaintenanceApi.Tests;

public class UserAuthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task List_WithoutSession_Returns401()
    {
        var response = await factory.CreateClient().GetAsync("/api/user");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(UserRole.Tenant, HttpStatusCode.Forbidden)]
    [InlineData(UserRole.Maintenance, HttpStatusCode.Forbidden)]
    [InlineData(UserRole.Admin, HttpStatusCode.OK)]
    public async Task List_IsAdminOnly(UserRole role, HttpStatusCode expected)
    {
        var client = await factory.ClientAs(role);
        var response = await client.GetAsync("/api/user");
        Assert.Equal(expected, response.StatusCode);
    }
}
```

#### Verify

``` sh
dotnet test                                # whole solution green
curl -i http://localhost:5000/api/user | head -1                   # HTTP/1.1 401
```

**Commit:** `feat(api): restrict user endpoints to admins`

## Phase 3: Sign-in on the client

A Pinia store owns the current user, the router refuses to render protected routes without one, and a login page fills the gap. Then a tiny fetch wrapper sends expired sessions back to login instead of leaving a dead table on screen.

### TASK 3.1: The auth store

- **create** maintenance_request/src/stores/auth.ts
- **create** maintenance_request/src/\_\_tests\_\_/fixtures/auth.ts
- **create** maintenance_request/src/\_\_tests\_\_/auth.spec.ts

A setup store, matching the composition style the components already use. It talks to the three auth endpoints with bare `fetch` on purpose: a 401 from *these* calls is an answer, not an expired session, so they must not trip the redirect added in Task 3.5.

*src/stores/auth.ts*

``` ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { User, UserRole } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  // false until the first /me round-trip settles, so the router guard can tell
  // "signed out" apart from "have not asked the server yet".
  const ready = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const role = computed<UserRole | null>(() => user.value?.userRole ?? null)
  const isAdmin = computed(() => role.value === 'Admin')
  const canManageRequests = computed(() => role.value === 'Admin' || role.value === 'Maintenance')

  async function fetchMe(): Promise<void> {
    try {
      const response = await fetch('/api/Auth/me')
      user.value = response.ok ? await response.json() : null
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await fetch('/api/Auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      throw new Error(
        response.status === 401 ? 'Email or password is incorrect.' : `Sign-in failed (${response.status})`,
      )
    }
    user.value = await response.json()
    ready.value = true
  }

  async function logout(): Promise<void> {
    try {
      await fetch('/api/Auth/logout', { method: 'POST' })
    } finally {
      user.value = null   // even if the network call failed, forget locally
    }
  }

  function clear(): void {
    user.value = null
  }

  return { user, ready, isAuthenticated, role, isAdmin, canManageRequests, fetchMe, login, logout, clear }
})
```

Two test helpers keep the specs short: a fetch stub that answers by URL prefix, and canned users.

*src/\_\_tests\_\_/fixtures/auth.ts*

``` ts
import { vi } from 'vitest'
import type { User } from '@/types'

export const admin: User = { id: 3, email: 'admin@test.local', firstName: 'Ada', lastName: 'Admin', address: '3 Test St', userRole: 'Admin' }
export const tenant: User = { id: 1, email: 'tenant@test.local', firstName: 'Terry', lastName: 'Tenant', address: '1 Test St', userRole: 'Tenant' }

type Stub = { url: string; status?: number; body?: unknown }

/** Stub global fetch. The first entry whose url is a prefix of the request wins; unmatched requests get a 404. */
export function stubFetch(stubs: Stub[]) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const hit = stubs.find((s) => url.startsWith(s.url))
    const status = hit?.status ?? (hit ? 200 : 404)
    return { ok: status < 400, status, json: async () => hit?.body } as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const emptyPage = { items: [], page: 1, pageSize: 20, totalCount: 0 }
```

*src/\_\_tests\_\_/auth.spec.ts*

``` ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { admin, stubFetch } from './fixtures/auth'

describe('auth store', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.unstubAllGlobals())

  it('fetchMe sets the user on 200 and marks ready', async () => {
    stubFetch([{ url: '/api/Auth/me', body: admin }])
    const auth = useAuthStore()
    expect(auth.ready).toBe(false)

    await auth.fetchMe()

    expect(auth.ready).toBe(true)
    expect(auth.user).toEqual(admin)
    expect(auth.isAdmin).toBe(true)
  })

  it('fetchMe leaves the user null on 401 but still marks ready', async () => {
    stubFetch([{ url: '/api/Auth/me', status: 401 }])
    const auth = useAuthStore()
    await auth.fetchMe()
    expect(auth.ready).toBe(true)
    expect(auth.isAuthenticated).toBe(false)
  })

  it('login POSTs credentials and stores the returned user', async () => {
    const fetchMock = stubFetch([{ url: '/api/Auth/login', body: admin }])
    const auth = useAuthStore()

    await auth.login('admin@test.local', 'pw')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/Auth/login')
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ email: 'admin@test.local', password: 'pw' })
    expect(auth.user).toEqual(admin)
  })

  it('login throws the friendly message on 401 and stays signed out', async () => {
    stubFetch([{ url: '/api/Auth/login', status: 401 }])
    const auth = useAuthStore()
    await expect(auth.login('x@y.z', 'bad')).rejects.toThrow('Email or password is incorrect.')
    expect(auth.isAuthenticated).toBe(false)
  })

  it('logout clears the user even when the request fails', async () => {
    stubFetch([{ url: '/api/Auth/logout', status: 500 }])
    const auth = useAuthStore()
    auth.user = admin
    await auth.logout()
    expect(auth.user).toBeNull()
  })
})
```

#### Verify

``` sh
pnpm test:unit --run auth.spec
```

**Commit:** `feat(web): add auth store`

### TASK 3.2: Login page

- **create** maintenance_request/src/views/LoginView.vue
- **create** maintenance_request/src/\_\_tests\_\_/LoginView.spec.ts

*src/views/LoginView.vue*

```
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const pending = ref(false)
const error = ref<string | null>(null)

// Only follow a redirect back into this app. A full URL or a
// protocol-relative "//evil.example" would be an open redirect.
const safeRedirect = (): string => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

const submit = async () => {
  pending.value = true
  error.value = null
  try {
    await auth.login(email.value, password.value)
    await router.replace(safeRedirect())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Sign-in failed'
    password.value = ''
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="login" aria-labelledby="login-heading" @submit.prevent="submit">
    <h2 id="login-heading">Sign in</h2>

    <label for="login-email">Email</label>
    <input id="login-email" v-model.trim="email" type="email" autocomplete="username" required />

    <label for="login-password">Password</label>
    <input id="login-password" v-model="password" type="password" autocomplete="current-password" required />

    <p v-if="error" class="field-error" role="alert">{{ error }}</p>

    <button type="submit" :disabled="pending">{{ pending ? 'Signing in…' : 'Sign in' }}</button>
  </form>
</template>

<style scoped>
/* Same recipe as .create-user in CreateUserModal.vue, in a card instead of a dialog. */
.login {
  display: flex; flex-direction: column; gap: 0.35rem;
  width: min(24rem, 100%); margin: var(--space-4) auto; padding: var(--space-4);
  border: 1px solid var(--rule); border-radius: var(--radius); background-color: var(--surface); box-shadow: var(--shadow);
}
.login h2 { margin: 0 0 0.75rem; font-family: var(--font-display); }
.login label { margin-top: 0.5rem; font-size: 0.8rem; font-weight: 600; color: var(--ink-soft); }
.login input { padding: 0.5rem 0.65rem; border: var(--border); border-radius: var(--radius-sm); background-color: var(--surface); font: inherit; }
.login input:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.login button { margin-top: 1rem; align-self: flex-end; }
.field-error { margin: 0.5rem 0 0; font-size: 0.85rem; color: var(--accent); }
</style>
```

*src/\_\_tests\_\_/LoginView.spec.ts*

``` ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import { admin, stubFetch } from './fixtures/auth'

const Stub = { template: '<div />' }

const mountLogin = async (initial = '/login') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/', component: Stub },
      { path: '/users', component: Stub },
    ],
  })
  await router.push(initial)
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins: [createPinia(), router] } })
  return { wrapper, router }
}

const fill = async (wrapper: Awaited<ReturnType<typeof mountLogin>>['wrapper']) => {
  await wrapper.find('#login-email').setValue('admin@test.local')
  await wrapper.find('#login-password').setValue('pw')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('LoginView', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('signs in and follows a local redirect', async () => {
    stubFetch([{ url: '/api/Auth/login', body: admin }])
    const { wrapper, router } = await mountLogin('/login?redirect=%2Fusers')
    await fill(wrapper)
    expect(router.currentRoute.value.path).toBe('/users')
  })

  it('refuses an off-site redirect and goes home instead', async () => {
    stubFetch([{ url: '/api/Auth/login', body: admin }])
    const { wrapper, router } = await mountLogin('/login?redirect=//evil.example')
    await fill(wrapper)
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('shows the error and clears the password on 401', async () => {
    stubFetch([{ url: '/api/Auth/login', status: 401 }])
    const { wrapper, router } = await mountLogin()
    await fill(wrapper)
    expect(wrapper.find('[role="alert"]').text()).toBe('Email or password is incorrect.')
    expect((wrapper.find('#login-password').element as HTMLInputElement).value).toBe('')
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
```

#### Verify

``` sh
pnpm test:unit --run LoginView.spec
```

**Commit:** `feat(web): add login view`

### TASK 3.3: Route guard and route metadata

- **modify** maintenance_request/src/router/index.ts
- **create** maintenance_request/src/\_\_tests\_\_/router.spec.ts

Routes declare what they need in `meta`; one guard enforces it. The `/` placeholder becomes a redirect to `/requests`. The `declare module` block types `meta` so a typo in a role name fails `pnpm type-check`.

*src/router/index.ts*

``` ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types'
import LoginView from '@/views/LoginView.vue'
import UsersView from '@/views/UsersView.vue'
import RequestsView from '@/views/RequestsView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable without a session. Everything else needs one. */
    public?: boolean
    /** If set, the signed-in user's role must be one of these. */
    roles?: UserRole[]
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
    { path: '/', redirect: { name: 'requests' } },
    { path: '/requests', name: 'requests', component: RequestsView },
    { path: '/users', name: 'users', component: UsersView, meta: { roles: ['Admin'] } },
  ],
})

router.beforeEach(async (to) => {
  // Resolved inside the guard: Pinia is installed by the time navigation starts,
  // but not necessarily when this module is first imported.
  const auth = useAuthStore()
  if (!auth.ready) await auth.fetchMe()

  if (to.meta.public) {
    // A signed-in user has no business on the login page.
    return auth.isAuthenticated ? { name: 'requests' } : true
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.roles && (!auth.role || !to.meta.roles.includes(auth.role))) {
    return { name: 'requests' }
  }
  return true
})

export default router
```

*src/\_\_tests\_\_/router.spec.ts*

``` ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { admin, tenant, stubFetch, emptyPage } from './fixtures/auth'

// The views mount lazily on navigation; give them an empty page to render.
const data = [{ url: '/api/User', body: emptyPage }, { url: '/api/MaintenanceRequest', body: emptyPage }]

describe('router guard', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.unstubAllGlobals())

  it('sends a signed-out visitor to login and remembers where they were going', async () => {
    stubFetch([{ url: '/api/Auth/me', status: 401 }])
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/users')
  })

  it('lets an admin reach /users', async () => {
    stubFetch([{ url: '/api/Auth/me', body: admin }, ...data])
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('users')
  })

  it('bounces a tenant from /users to /requests', async () => {
    stubFetch([{ url: '/api/Auth/me', body: tenant }, ...data])
    await router.push('/users')
    expect(router.currentRoute.value.name).toBe('requests')
  })

  it('keeps a signed-in user off the login page', async () => {
    stubFetch([{ url: '/api/Auth/me', body: tenant }, ...data])
    await router.push('/login')
    expect(router.currentRoute.value.name).toBe('requests')
  })

  it('asks /me only once per session', async () => {
    const fetchMock = stubFetch([{ url: '/api/Auth/me', body: tenant }, ...data])
    await router.push('/requests')
    await router.push('/login')
    const meCalls = fetchMock.mock.calls.filter(([u]) => String(u).startsWith('/api/Auth/me'))
    expect(meCalls).toHaveLength(1)
    expect(useAuthStore().ready).toBe(true)
  })
})
```

> **Existing App.spec.ts.**
>
> It mounts `App` with `plugins: [router]` and no Pinia, so the guard now throws "no active Pinia". Task 3.4 rewrites that spec along with `App.vue`.

#### Verify

``` sh
pnpm test:unit --run router.spec
```

**Commit:** `feat(web): guard routes by session and role`

### TASK 3.4: Navigation that knows who you are

- **modify** maintenance_request/src/App.vue
- **modify** maintenance_request/src/\_\_tests\_\_/App.spec.ts

*src/App.vue (script and template; keep the existing styles)*

```
<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from 'vue-sonner'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const signOut = async () => {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <main>
    <div class="center">
      <h1>Residential Maintenance Requests</h1>
      <nav v-if="auth.user" class="link-bar" aria-label="Primary">
        <RouterLink :to="{ name: 'requests' }">View Requests</RouterLink>
        <RouterLink v-if="auth.isAdmin" :to="{ name: 'users' }">View Users</RouterLink>
        <span class="who">{{ auth.user.firstName }} · {{ auth.user.userRole }}</span>
        <button type="button" class="sign-out" @click="signOut">Sign out</button>
      </nav>
      <RouterView />
    </div>
    <Toaster />
  </main>
</template>
```

Add two small rules to the scoped style block: `.who` in `--ink-faint` with `margin-left: auto`, and `.sign-out` styled like a link (`all: unset; cursor: pointer; color: var(--accent)`). Rewrite `App.spec.ts` around the store: install `createPinia()` alongside the router, use `stubFetch`, and replace the "three nav links" test with these:

*src/\_\_tests\_\_/App.spec.ts (new cases)*

``` ts
it('hides the nav while signed out', async () => {
  stubFetch([{ url: '/api/Auth/me', status: 401 }])
  const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
  await router.push('/requests'); await flushPromises()
  expect(wrapper.find('nav').exists()).toBe(false)
  expect(router.currentRoute.value.name).toBe('login')
})

it('shows Requests and Users to an admin, with a sign-out control', async () => {
  stubFetch([{ url: '/api/Auth/me', body: admin }, ...data])
  const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
  await router.push('/requests'); await flushPromises()
  const links = wrapper.findAllComponents(RouterLink)
  expect(links.map((l) => l.text())).toEqual(['View Requests', 'View Users'])
  expect(wrapper.text()).toContain('Ada · Admin')
  expect(wrapper.find('button.sign-out').exists()).toBe(true)
})

it('hides Users from a tenant', async () => {
  stubFetch([{ url: '/api/Auth/me', body: tenant }, ...data])
  const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
  await router.push('/requests'); await flushPromises()
  expect(wrapper.findAllComponents(RouterLink).map((l) => l.text())).toEqual(['View Requests'])
})
```

#### Verify

``` sh
pnpm test:unit --run
# In the browser: open the app signed out → login page. Sign in as dev_admin → both links. Sign out → login page.
```

**Commit:** `feat(web): role-aware navigation with sign-out`

### TASK 3.5: Send expired sessions back to login

- **create** maintenance_request/src/lib/api.ts
- **modify** maintenance_request/src/main.ts
- **modify** src/views/UsersView.vue, RequestsView.vue, components/Table.vue, CreateUserModal.vue, CreateMaintenanceRequestModal.vue

After eight idle hours the cookie expires and every data call turns into "Failed to fetch users. 401". A one-function wrapper notices the 401 and tells whoever is listening. `main.ts` is the listener, which keeps `api.ts` free of router and store imports (and free of import cycles).

*src/lib/api.ts*

``` ts
type Listener = () => void
const unauthorized = new Set<Listener>()

/** Register a callback for any 401 from a data endpoint. Returns an unsubscribe. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorized.add(listener)
  return () => unauthorized.delete(listener)
}

/**
 * fetch, plus a hook for expired sessions. The session cookie already rides
 * along because fetch defaults to credentials: 'same-origin', so the call
 * shape stays identical to a bare fetch (and existing tests keep passing).
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const response = init === undefined ? await fetch(input) : await fetch(input, init)
  if (response.status === 401) unauthorized.forEach((l) => l())
  return response
}
```

*src/main.ts*

``` ts
import { onUnauthorized } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
// ...existing imports and app setup

onUnauthorized(() => {
  useAuthStore().clear()
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

app.mount('#app')
```

Then, in the five files listed, replace `fetch(` with `apiFetch(` and add the import. Because the wrapper forwards a bare call untouched, assertions like `toHaveBeenCalledWith('/api/User?page=1…')` in the existing specs still hold. Add one spec for the wrapper itself:

*src/\_\_tests\_\_/api.spec.ts*

``` ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { apiFetch, onUnauthorized } from '@/lib/api'

describe('apiFetch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('notifies listeners on 401 and returns the response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const listener = vi.fn()
    const off = onUnauthorized(listener)

    const response = await apiFetch('/api/User')

    expect(response.status).toBe(401)
    expect(listener).toHaveBeenCalledTimes(1)
    off()
  })

  it('stays quiet on other statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    const listener = vi.fn()
    const off = onUnauthorized(listener)
    await apiFetch('/api/User')
    expect(listener).not.toHaveBeenCalled()
    off()
  })
})
```

#### Verify

``` sh
pnpm test:unit --run && pnpm type-check && pnpm check
# In the browser: sign in, delete the maintenance.session cookie in DevTools, click a page → back at login with ?redirect=
```

**Commit:** `feat(web): redirect to login when a data request returns 401`

## Phase 4: Role-aware UI

The API already refuses what it should. Now the UI stops offering it: no Edit or Delete columns for people who would only get a 403, and a creator picker that only admins see. This closes the note in `Table.vue`.

### TASK 4.1: Table shows action columns only when told to

- **modify** maintenance_request/src/components/Table.vue
- **modify** maintenance_request/src/views/UsersView.vue, RequestsView.vue
- **modify** maintenance_request/src/\_\_tests\_\_/Table.spec.ts

Keep `Table` ignorant of auth. Two boolean props, default off, and the views pass what the store says. That keeps the component testable without Pinia and makes the permission visible at the call site.

*src/components/Table.vue (diff)*

```
const props = defineProps<{
  headers: Header[]
  items: Item[]
  type: string
  sort?: Sort
  busy?: boolean
  canEdit?: boolean      // NEW, default false
  canDelete?: boolean    // NEW, default false
}>()

const actionColumns = computed(() => Number(props.canEdit) + Number(props.canDelete))

<!-- thead: replace the two static headers and the TODO comment -->
<th v-if="canEdit">Edit</th>
<th v-if="canDelete">Delete</th>

<!-- empty row -->
<td :colspan="headers.length + actionColumns" class="no-data">No data available.</td>

<!-- body: wrap the two action cells -->
<td v-if="canEdit"> ...existing edit button... </td>
<td v-if="canDelete"><button @click="deleteRow(type, item.id)">X</button></td>
```

*src/views/RequestsView.vue and UsersView.vue*

```
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()

<!-- RequestsView -->
<Table ... :can-edit="auth.canManageRequests" :can-delete="auth.isAdmin">
<!-- UsersView (route is admin-only, but be explicit) -->
<Table ... :can-edit="auth.isAdmin" :can-delete="auth.isAdmin" />
```

#### Tests to update

- `Table.spec.ts`: every case that looks for the Edit/Delete headers or clicks an edit or delete button now passes `canEdit: true, canDelete: true` in `props`. Add one case: mounted with neither prop, `wrapper.findAll('th')` has exactly `headers.length` entries and no `tbody button` exists.
- `UsersView.spec.ts`, `RequestsView.spec.ts`: mount with `global: { plugins: [createPinia()] }`. The fetch stubs already return list data; the store is simply empty, which is fine for these tests.

#### Verify

``` sh
pnpm test:unit --run
# Browser: sign in as dev_tenant → no Edit/Delete columns on requests. dev_maintenance → Edit only. dev_admin → both.
```

**Commit:** `feat(web): show edit and delete controls by role`

### TASK 4.2: Creator picker for admins only

- **modify** maintenance_request/src/components/CreateMaintenanceRequestModal.vue
- **modify** maintenance_request/src/\_\_tests\_\_/CreateMaintenanceRequestModal.spec.ts

Today the modal loads users on open (a call tenants will now get 403 on) and renders a bare text input for "Created by" with a stray closing tag. Make the picker a `<select>` fed by the already-loaded `users`, show it only to admins, and leave `createdBy` out of the body otherwise so the API uses the session.

*src/components/CreateMaintenanceRequestModal.vue (diff)*

```
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()

watch(open, (isOpen) => {
  if (isOpen) {
    if (auth.isAdmin) loadUsers()          // tenants and maintenance never call /api/User
  } else {
    draft.value = emptyRequest()
  }
})

const submit = async () => {
  pending.value = true
  try {
    const { createdBy, ...rest } = draft.value
    const body = auth.isAdmin && createdBy !== '' ? { ...rest, createdBy } : rest
    const response = await apiFetch('/api/MaintenanceRequest/CreateMaintenanceRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    // ...unchanged
  }
}

<!-- template: replace the "Created by" input -->
<template v-if="auth.isAdmin">
  <label for="create-request-createdBy">Created by</label>
  <select id="create-request-createdBy" v-model="draft.createdBy" required>
    <option value="" disabled>Select a tenant</option>
    <option v-for="user in users" :key="user.id" :value="user.id">
      {{ user.lastName }}, {{ user.firstName }} — {{ user.email }}
    </option>
  </select>
  <p v-if="usersError" class="field-error">{{ usersError }}</p>
</template>
```

#### Tests to update

- Mount with `createPinia()` and set `useAuthStore().user = tenant` or `admin` before `setProps({ open: true })`.
- As tenant: no `#create-request-createdBy` in the DOM, `/api/User` is never fetched, and the POST body has no `createdBy` key.
- As admin: the select lists the stubbed users and the POST body carries the chosen id as a number.

#### Verify

``` sh
pnpm test:unit --run
# Browser as dev_tenant: create a request → "Created By" column shows Terrance Tenant.
```

**Commit:** `feat(web): let only admins choose a request's creator`

## Phase 5: Harden and document

Small things that make the feature survive a `docker compose down`, a new contributor, and a production reverse proxy. The first three are quick; the last two are optional and marked so.

### TASK 5.1: Persist Data Protection keys across container restarts

- **modify** docker-compose.yml

The cookie is encrypted with keys ASP.NET generates on first run and stores under `/root/.aspnet/DataProtection-Keys` inside the container. Without a volume, `docker compose down` throws them away and every browser is silently signed out. One volume fixes it; `dotnet watch` restarts already keep them because the container survives.

*docker-compose.yml*

``` yaml
  api:
    volumes:
      - ./MaintenanceApi:/src
      - api-bin:/src/bin
      - api-obj:/src/obj
      - nuget-packages:/root/.nuget/packages
      - dataprotection-keys:/root/.aspnet/DataProtection-Keys     # NEW

volumes:
  mssql-data:
  frontend-node-modules:
  api-bin:
  api-obj:
  nuget-packages:
  dataprotection-keys:                                             # NEW
```

#### Verify

``` sh
docker compose down && docker compose up -d
# a browser tab that was signed in before the restart is still signed in
```

**Commit:** `chore(compose): persist Data Protection keys`

### TASK 5.2: Write the dev accounts into the README

- **modify** README.md

`seed_heavy.sql` already promises the README has the dev password. Add a section like this, with the real password you hashed. If you have lost it, the snippet after the table mints a new hash you can paste into both `dev_accounts.sql` and `seed_heavy.sql`.

*README.md*

``` markdown
## Dev accounts

The seed scripts create one account per role. All seeded users, including the
100k generated ones, share the same password: `<dev password>`.

| Email                     | Role        |
|---------------------------|-------------|
| dev_tenant@email.com      | Tenant      |
| dev_maintenance@email.com | Maintenance |
| dev_admin@email.com       | Admin       |

Sessions are an HttpOnly cookie named `maintenance.session`, valid for 8 hours
of inactivity. Sign out clears it.
```

*One-off: mint a new dev hash (run, copy the output, then delete the test)*

``` csharp
public class MintDevHash(ITestOutputHelper output)
{
    [Fact]
    public void Print() =>
        output.WriteLine(new PasswordHasher<User>().HashPassword(new User(), "the-new-dev-password"));
}
// dotnet test MaintenanceApi.Tests --filter MintDevHash --logger "console;verbosity=detailed"
```

**Commit:** `docs: list dev accounts and session behaviour`

### TASK 5.3: Production notes: TLS, forwarded headers, Secure cookie

- **modify** MaintenanceApi/Program.cs

Behind Nginx the API sees plain HTTP even when the browser used HTTPS. With `SecurePolicy = SameAsRequest` that means a non-Secure cookie in production. Either trust the proxy's `X-Forwarded-Proto` or force the flag outside Development. The second is simpler and does not depend on Nginx config:

*MaintenanceApi/Program.cs*

``` csharp
options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
    ? CookieSecurePolicy.SameAsRequest
    : CookieSecurePolicy.Always;
```

The README lists Nginx as part of the stack. When that config exists, it needs `proxy_set_header Cookie $http_cookie;` (passed by default) and must not strip `Set-Cookie`. Nothing else changes: the cookie has no `Domain`, so it binds to whatever host the browser used.

**Commit:** `feat(api): require Secure cookies outside Development`

### TASK 5.4 · optional: Change your own password

- **modify** MaintenanceApi/Controllers/AuthController.cs
- **modify** MaintenanceApi.Tests/AuthTests.cs

Admins set a temporary password at creation (Task 0.2). This lets the account holder replace it. Re-verifying the current password means a stolen unlocked laptop cannot lock the real owner out.

*MaintenanceApi/Controllers/AuthController.cs*

``` csharp
public record ChangePasswordRequest(
    [Required, MaxLength(128)] string CurrentPassword,
    [Required, MinLength(8), MaxLength(128)] string NewPassword);

[HttpPost("password")]
[Authorize]
public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
{
    var user = await db.Users.FindAsync(User.GetUserId());
    if (user is null) return Unauthorized();

    var check = hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
    if (check == PasswordVerificationResult.Failed)
        return BadRequest(new { message = "Current password is incorrect." });

    user.PasswordHash = hasher.HashPassword(user, request.NewPassword);
    await db.SaveChangesAsync();
    return NoContent();
}
```

*MaintenanceApi.Tests/AuthTests.cs (add)*

``` csharp
[Fact]
public async Task ChangePassword_ReplacesTheHash_AndOldPasswordStopsWorking()
{
    var client = await factory.ClientAs(UserRole.Maintenance);

    var change = await client.PostAsJsonAsync("/api/auth/password",
        new { currentPassword = ApiFactory.Password, newPassword = "a-brand-new-one" });
    Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

    var fresh = factory.CreateClient();
    var old = await fresh.PostAsJsonAsync("/api/auth/login", new { email = "maintenance@test.local", password = ApiFactory.Password });
    Assert.Equal(HttpStatusCode.Unauthorized, old.StatusCode);
    var @new = await fresh.PostAsJsonAsync("/api/auth/login", new { email = "maintenance@test.local", password = "a-brand-new-one" });
    Assert.Equal(HttpStatusCode.OK, @new.StatusCode);
}
```

> **Test isolation.**
>
> This test mutates the shared seeded Maintenance user. Because `IClassFixture` shares one `ApiFactory` per class, put it in its own class (its own in-memory database) or restore the password at the end.

**Commit:** `feat(api): let a signed-in user change their password`

### TASK 5.5 · optional: Slow down password guessing

- **modify** MaintenanceApi/Program.cs
- **modify** MaintenanceApi/Controllers/AuthController.cs

The built-in rate limiter (shared framework, no package) caps login attempts per client address. Ten per minute is generous for people and useless for a dictionary attack.

*MaintenanceApi/Program.cs*

``` csharp
using System.Threading.RateLimiting;

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

app.UseRateLimiter();      // after UseRouting (implicit), before MapControllers
```

*MaintenanceApi/Controllers/AuthController.cs*

``` csharp
using Microsoft.AspNetCore.RateLimiting;

[HttpPost("login")]
[AllowAnonymous]
[EnableRateLimiting("login")]
public async Task<ActionResult<UserResponse>> Login(LoginRequest request)
```

#### Verify

``` sh
for i in $(seq 1 11); do curl -s -o /dev/null -w '%{http_code}\n' -H 'Content-Type: application/json' \
  -d '{"email":"x@y.z","password":"no"}' http://localhost:5000/api/auth/login; done   # ten 401s, then a 429
```

**Commit:** `feat(api): rate-limit login attempts`

## Gotchas

Things that cost an hour each if you meet them cold. Most are already handled in the tasks above; this is the index.

| Symptom | Cause | Fix |
|----|----|----|
| Login returns 200 with `Set-Cookie`, but `/me` is 401 right after | Cookie marked `Secure` on a plain-http origin; the browser drops it. | `SecurePolicy = SameAsRequest` in Development (Task 1.1). |
| Unauthenticated API call answers 302 to `/Account/Login` | Endpoint not recognised as an API endpoint, so the cookie handler redirects. | Should not happen with `[ApiController]` on .NET 10. If it does, chain `.DisableCookieRedirect()` onto `app.MapControllers()`. |
| Every user signed out after `docker compose down` | Data Protection keys lived only inside the container. | Key volume (Task 5.1). |
| `[Authorize]` treats a valid cookie as anonymous | `ClaimsIdentity` built without an authentication type. | Pass the scheme name to the constructor (Task 1.2). |
| `[Authorize(Roles = "admin")]` always 403s | Role match is case-sensitive; the claim says `Admin`. | Use the enum names exactly. |
| Tests: "Services for database providers 'SqlServer', 'InMemory' have been registered" | Only `DbContextOptions` was removed from DI. | Also remove `IDbContextOptionsConfiguration<AppDbContext>` (Task 1.4). |
| Tests: `Program` is inaccessible | Top-level statements make it internal. | `public partial class Program { }` at the end of `Program.cs`. |
| Tests: `ReadFromJsonAsync<UserResponse>` throws on `"Admin"` | Client deserialiser has no string-enum converter; the API writes enums as names. | Use `ApiFactory.Json` everywhere you read a response. |
| Tests: login works with `ADMIN@test.local` on SQL Server but not in-memory | In-memory compares strings case-sensitively. | Normalise emails on create and login (Tasks 0.1, 1.3). |
| Vitest: "getActivePinia() was called but there was no active Pinia" | A guard or component uses the store without Pinia installed. | `createPinia()` in `global.plugins`, or `setActivePinia` in `beforeEach`. |
| Vitest: router tests bleed state into each other | `@/router` is a module singleton; the store is not, but the current route is. | Push to a known route in `beforeEach`, as `App.spec.ts` already does. |
| Signed in, but navigating shows "Failed to fetch … 401" | Cookie expired (8h idle) or keys rotated. | Task 3.5 turns this into a redirect to login. |
| Nothing after `curl -b jar` is authenticated | Jar written with `-c` on login but the cookie was `Secure`, or you hit a different host name. | Same host string for every call; check the jar file has a line for `maintenance.session`. |

## Later

Deliberately out of this work order. Each is a self-contained follow-up once sign-in exists.

- **Tenants see only their own requests.** In `MaintenanceRequestController.Get` and `GetById`: `if (User.IsInRole(UserRole.Tenant)) { var me = User.GetUserId(); requests = requests.Where(r => r.CreatedBy == me); }`. Capture the id in a local first so EF sends it as a parameter. The UI needs no change.
- **Map `assigned_to`.** The column and FK already exist in `schema.sql` but not in `AppDbContext`. Adding it gives the Maintenance role a real job: pick up a request, close it.
- **Self-registration**, if tenants should onboard themselves: an anonymous `POST /api/auth/register` that forces `UserRole.Tenant` and reuses the create logic from Task 0.1.
- **Password reset by email** needs an outbound mail service and a token table; skip until the app has somewhere to send mail from.
- **Antiforgery tokens**, only if you ever loosen `SameSite` or accept form posts. ASP.NET's `AddAntiforgery(o => o.HeaderName = "X-CSRF-TOKEN")` plus a readable cookie is the documented SPA pattern.
- **Playwright e2e** for the sign-in flow against the compose stack, using the dev accounts. `pnpm test:e2e` is already wired; it needs a `playwright.config` with `baseURL` set from `FRONTEND_PORT`.

Sources: ASP.NET Core docs on cookie authentication, API endpoint auth (.NET 10), role authorisation, antiforgery and integration testing; Vue Router docs on navigation guards and meta; Pinia docs on setup stores and use outside components. Read against the working tree at commit 46e4c3c plus uncommitted compose and env changes.
