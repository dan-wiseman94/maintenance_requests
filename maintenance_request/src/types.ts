

export type User = {
    id: number;
    firstName: string;
    lastName: string;
    address: string;
    userRole: string;
};
export type MaintenanceRequest = {
    id: number;
    location: string;
    maintenanceType: string;
    createdAt: string;
    createdBy: number;
    requestStatus: string;
    createdByName: string;
};

