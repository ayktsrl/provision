import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Firestore
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { ReportStatus, MonthlyReport, Ship, Company } from '../types';

// ✅ Your real Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBK9L2VCiHkF-Mb_uCbjgevyPLdrWGaQkM",
  authDomain: "provisionfollowup.firebaseapp.com",
  projectId: "provisionfollowup",
  storageBucket: "provisionfollowup.firebasestorage.app",
  messagingSenderId: "921802121277",
  appId: "1:921802121277:web:9e9a06f4b735927aaa8a54"
};

const app = initializeApp(firebaseConfig);

const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

const companiesCol = () => collection(firestore, 'companies');
const companyDoc = (companyId: string) => doc(firestore, 'companies', companyId);
const shipsCol = (companyId: string) => collection(firestore, 'companies', companyId, 'ships');
const shipDoc = (companyId: string, shipId: string) => doc(firestore, 'companies', companyId, 'ships', shipId);
const reportsCol = (companyId: string) => collection(firestore, 'companies', companyId, 'reports');
const reportDoc = (companyId: string, reportId: string) => doc(firestore, 'companies', companyId, 'reports', reportId);

export const db = {
  // --- Companies ---
  createCompany: async (companyId: string, name: string): Promise<void> => {
    const payload: Company = {
      companyId,
      name,
      adminUid: companyId,
      createdAt: Date.now()
    };
    await setDoc(companyDoc(companyId), payload, { merge: true });
  },

  getCompany: async (companyId: string): Promise<Company | null> => {
    const snap = await getDoc(companyDoc(companyId));
    return snap.exists() ? (snap.data() as Company) : null;
  },

  // --- Ships ---
  getShips: async (companyId: string): Promise<Ship[]> => {
    const snap = await getDocs(shipsCol(companyId));
    return snap.docs.map(d => ({ shipId: d.id, ...(d.data() as Omit<Ship, 'shipId'>) }));
  },

  createShip: async (companyId: string, shipName: string, username: string, password: string): Promise<Ship> => {
    const ref = doc(shipsCol(companyId));
    const newShip: Ship = {
      shipId: ref.id,
      shipName,
      username,
      password,
      active: true,
      isArchived: false,
      companyId
    };
    await setDoc(ref, newShip);
    return newShip;
  },

  updateShip: async (companyId: string, shipId: string, updates: Partial<Ship>): Promise<void> => {
    await updateDoc(shipDoc(companyId, shipId), updates as any);
  },

  updateShipArchived: async (companyId: string, shipId: string, isArchived: boolean): Promise<void> => {
    await updateDoc(shipDoc(companyId, shipId), { isArchived } as any);
  },

  authenticateVessel: async (username: string, password: string): Promise<Ship | null> => {
    // Global search across all companies would require collectionGroup.
    // We keep it simple: vessel must login inside a company context OR we do a collectionGroup query later.
    // For now we do collectionGroup to support "single login screen" requirement.
    const { collectionGroup } = await import('firebase/firestore');
    const q = query(
      collectionGroup(firestore, 'ships'),
      where('username', '==', username),
      where('password', '==', password),
      where('isArchived', '==', false)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const data = d.data() as any;

    return {
      shipId: d.id,
      shipName: data.shipName,
      username: data.username,
      password: data.password,
      active: data.active,
      isArchived: data.isArchived,
      companyId: data.companyId
    } as Ship;
  },

  // --- Reports ---
  getReports: async (companyId: string, month: string): Promise<MonthlyReport[]> => {
    const q = query(reportsCol(companyId), where('month', '==', month));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as MonthlyReport);
  },

  getReport: async (companyId: string, month: string, shipId: string): Promise<MonthlyReport | null> => {
    const rid = `${month}_${shipId}`;
    const snap = await getDoc(reportDoc(companyId, rid));
    return snap.exists() ? (snap.data() as MonthlyReport) : null;
  },

  saveReport: async (report: MonthlyReport): Promise<void> => {
    const rid = `${report.month}_${report.shipId}`;
    await setDoc(reportDoc(report.companyId, rid), { ...report, updatedAt: Date.now() }, { merge: true });
  },

  updateReportStatus: async (companyId: string, month: string, shipId: string, status: ReportStatus): Promise<void> => {
    const rid = `${month}_${shipId}`;
    const updates: any = { status, updatedAt: Date.now() };
    if (status === ReportStatus.SUBMITTED) updates.submittedAt = Date.now();
    await updateDoc(reportDoc(companyId, rid), updates);
  }
};
