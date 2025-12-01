export interface Customer {
  installationNumber: string;
  name: string;
  phone: string;
  address: string;
  latitude?: string;
  longitude?: string;
}

export interface Credential {
  username: string;
  password: string;
  allowedDeviceId?: string;
}

export interface UserActivityStat {
  username: string;
  queryCount: number;
  lastLogin: string;
}