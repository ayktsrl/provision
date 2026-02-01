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
}

export interface Ship {
  shipId: string;
  shipName: string;

  // Vessel login (email-based)
  email: string;

  // ⚠️ Do not use in rules/auth checks; keep only if you want to display it to company.
  // Better: remove later. For now, optional to avoid breaking UI.
  password?: string;

  // Firebase Auth UID of vessel user (created with secondary auth)
  authUid: string;

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

  // Important for filtering & rules
  companyId: string;
  shipAuthUid: string;

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
}

export interface Company {
  companyId: string;
  name: string;
  adminUid: string;
  createdAt: number;
}
