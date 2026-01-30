
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
  email: string;
  role: UserRole;
  companyId: string;
  shipId?: string;
  shipName?: string;
}

export interface Ship {
  shipId: string;
  shipName: string;
  email: string;      // Login email managed by company
  password: string;   // Login password managed by company
  active: boolean;    // General status
  isArchived: boolean; // Decommissioned/Old vessels
  // Added companyId to fix "Property 'companyId' does not exist on type 'Ship'" error
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
}

export interface Company {
  companyId: string;
  name: string;
  createdAt: number;
}
