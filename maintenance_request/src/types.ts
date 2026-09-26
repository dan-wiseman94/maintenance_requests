export type User = {
  id: number
  email: string
  firstName: string
  lastName: string
  address: string
  userRole: UserRole
}

export type MaintenanceRequest = {
  id: number
  location: string
  maintenanceType: string
  createdAt: string
  createdBy: number
  requestStatus: string
  createdByName: string
}
export type PagedResult<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export type Header = {
  key: string
  label: string
  editable?: boolean
}

export type Sort = {
  key: string
  desc: boolean
}

export type UserRole = 'Tenant' | 'Maintenance' | 'Admin'
