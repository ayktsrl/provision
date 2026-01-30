export enum UserRole {
  COMPANY = 'company',
  VESSEL = 'vessel'
}

export enum ReportStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted'
}

export interface UserProfile {
  uid: string;
  role: UserRole;
  companyId: string;

  // Company users
  email?: string;

  // Vessel users
  shipId?: string;
  shipName?: string;
  username?: string;
}

export interface Ship {
  shipId: string;
  shipName: string;

  // Vessel login
  username: string;
  password: string;

  active: boolean;
  isArchived: boolean;
  companyId: string;
}

export interface ProvisionItem {
  id: string;
  nameEn: string;
  nameTr: string;
  unit: string;
  openingQty: number;
  openingPrice: number;
  purchaseQty: number;
  purchasePrice: number;
  closingQty: number;
}

export interface GuestEntry {
  id: string;
  remark: string;
  meals: string[]; // ['B', 'L', 'D']
}

export interface SupplyEntry {
  id: string;
  date: string;
  supplier: string;
  amount: number;
}

export interface MonthlyReport {
  id: string;
  month: string;
  shipId: string;
  shipName: string;
  crewCount: number;
  guestMeals: number;
  guestMealDetails?: Record<string, GuestEntry[]>;
  supplyEntries?: SupplyEntry[];
  items: Record<string, ProvisionItem[]>;
  openingTotal: number;
  suppliesTotal: number;
  closingTotal: number;
  consumptionTotal: number;
  dailyPerPerson: number;
  status: ReportStatus;
  updatedAt: number;
  submittedAt?: number;

  // Important for company filtering
  companyId: string;
}

export interface Company {
  companyId: string;
  name: string;
  adminUid: string;
  createdAt: number;
}
