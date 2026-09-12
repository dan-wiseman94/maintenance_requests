import type { MaintenanceRequest, PagedResult } from '@/types'

// Values mirror what the API actually returns: RequestStatus is serialized
// as a string by JsonStringEnumConverter, and createdAt is an ISO 8601 string.
const STATUSES = ['Open', 'InProgress', 'Closed'] as const
const TYPES = ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Pest Control', 'Other'] as const
const LOCATIONS = ['Kitchen', 'Bathroom', 'Bedroom', 'Living Room', 'Garage', 'Basement', 'Hallway', 'Roof'] as const
const USERS = [
    { id: 1, name: 'Alice Johnson' },
    { id: 2, name: 'Bob Smith' },
    { id: 3, name: 'Carol Diaz' },
    { id: 4, name: 'Dave Nguyen' },
    { id: 5, name: 'Erin Patel' },
] as const

/**
 * Builds a single, fully deterministic MaintenanceRequest. Given the same `id`
 * you always get the same record, so tests are reproducible and you can
 * assert on specific values (e.g. `makeMaintenanceRequest(1).location`).
 * Pass `overrides` to pin the fields a test actually cares about.
 */
export function makeMaintenanceRequest(
    id: number,
    overrides: Partial<MaintenanceRequest> = {},
): MaintenanceRequest {
    const i = id - 1
    const user = USERS[i % USERS.length]
    // One request per day, counting back from a fixed date so ordering is stable.
    const createdAt = new Date(Date.UTC(2026, 0, 1, 9, 0, 0) - i * 86_400_000).toISOString()

    return {
        id,
        location: `${LOCATIONS[i % LOCATIONS.length]} ${Math.floor(i / LOCATIONS.length) + 1}`,
        maintenanceType: TYPES[i % TYPES.length],
        createdAt,
        createdBy: user.id,
        requestStatus: STATUSES[i % STATUSES.length],
        createdByName: user.name,
        ...overrides,
    }
}

/** Builds `count` requests with ids 1..count. */
export function makeMaintenanceRequests(count = 100): MaintenanceRequest[] {
    return Array.from({ length: count }, (_, i) => makeMaintenanceRequest(i + 1))
}

/**
 * Wraps a slice of `all` in the API's PagedResult envelope, exactly as
 * `/api/MaintenanceRequest?page=N&pageSize=M` would return it.
 * Defaults match the frontend's request (page 1, pageSize 20).
 */
export function makePagedMaintenanceRequests(
    page = 1,
    pageSize = 20,
    all: MaintenanceRequest[] = makeMaintenanceRequests(100),
): PagedResult<MaintenanceRequest> {
    const start = (page - 1) * pageSize
    return {
        items: all.slice(start, start + pageSize),
        page,
        pageSize,
        totalCount: all.length,
    }
}
