
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
import { UserRole, ReportStatus, MonthlyReport, Ship } from '../types';

// Placeholder config - replace with your actual keys from Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

let firestore: Firestore | null = null;
let useLocalStorage = true;

// Check if the user has updated the placeholders
if (firebaseConfig.apiKey !== "YOUR_ACTUAL_API_KEY" && firebaseConfig.projectId !== "your-project-id") {
  try {
    const app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    useLocalStorage = false;
  } catch (e) {
    console.warn("Firebase initialization failed, falling back to LocalStorage:", e);
    useLocalStorage = true;
  }
}

/**
 * LOCAL STORAGE IMPLEMENTATION (Fallback)
 */
const localStore = {
  get: (key: string) => {
    const val = localStorage.getItem(`provision_${key}`);
    return val ? JSON.parse(val) : null;
  },
  set: (key: string, val: any) => {
    localStorage.setItem(`provision_${key}`, JSON.stringify(val));
  }
};

const localDB = {
  getShips: async (companyId: string): Promise<Ship[]> => {
    const ships = localStore.get('ships') || [];
    return ships.filter((s: any) => s.companyId === companyId);
  },
  createShip: async (companyId: string, shipName: string, email: string, password: string): Promise<Ship> => {
    const ships = localStore.get('ships') || [];
    const newShip: Ship = {
      shipId: 'ship_' + Date.now(),
      shipName,
      email,
      password,
      active: true,
      isArchived: false,
      companyId
    } as any;
    ships.push(newShip);
    localStore.set('ships', ships);
    return newShip;
  },
  updateShip: async (shipId: string, updates: Partial<Ship>): Promise<void> => {
    const ships = localStore.get('ships') || [];
    const idx = ships.findIndex((s: any) => s.shipId === shipId);
    if (idx !== -1) {
      ships[idx] = { ...ships[idx], ...updates };
      localStore.set('ships', ships);
    }
  },
  updateShipArchived: async (shipId: string, isArchived: boolean): Promise<void> => {
    await localDB.updateShip(shipId, { isArchived });
  },
  authenticateVessel: async (email: string, password: string): Promise<Ship | null> => {
    const ships = localStore.get('ships') || [];
    return ships.find((s: any) => s.email === email && s.password === password && !s.isArchived) || null;
  },
  getReports: async (companyId: string, month: string): Promise<MonthlyReport[]> => {
    const reports = localStore.get('reports') || [];
    return reports.filter((r: any) => r.companyId === companyId && r.month === month);
  },
  getReport: async (companyId: string, month: string, shipId: string): Promise<MonthlyReport | null> => {
    const reports = localStore.get('reports') || [];
    return reports.find((r: any) => r.shipId === shipId && r.month === month) || null;
  },
  saveReport: async (report: MonthlyReport): Promise<void> => {
    const reports = localStore.get('reports') || [];
    const idx = reports.findIndex((r: any) => r.shipId === report.shipId && r.month === report.month);
    const updatedReport = { ...report, updatedAt: Date.now() };
    if (idx !== -1) reports[idx] = updatedReport;
    else reports.push(updatedReport);
    localStore.set('reports', reports);
  },
  updateReportStatus: async (month: string, shipId: string, status: ReportStatus): Promise<void> => {
    const reports = localStore.get('reports') || [];
    const idx = reports.findIndex((r: any) => r.shipId === shipId && r.month === month);
    if (idx !== -1) {
      reports[idx].status = status;
      reports[idx].updatedAt = Date.now();
      if (status === ReportStatus.SUBMITTED) reports[idx].submittedAt = Date.now();
      localStore.set('reports', reports);
    }
  }
};

/**
 * MAIN DB EXPORT (Proxies to Firestore or LocalStorage)
 */
export const db = {
  isLocal: () => useLocalStorage,
  getShips: async (companyId: string) => {
    if (useLocalStorage || !firestore) return localDB.getShips(companyId);
    try {
      const q = query(collection(firestore, 'ships'), where('companyId', '==', companyId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ shipId: doc.id, ...doc.data() } as Ship));
    } catch (e) {
      useLocalStorage = true;
      return localDB.getShips(companyId);
    }
  },
  createShip: async (companyId: string, shipName: string, email: string, password: string) => {
    if (useLocalStorage || !firestore) return localDB.createShip(companyId, shipName, email, password);
    try {
      const shipRef = doc(collection(firestore, 'ships'));
      const newShip = { shipId: shipRef.id, shipName, email, password, active: true, isArchived: false, companyId };
      await setDoc(shipRef, newShip);
      return newShip as any;
    } catch (e) {
      useLocalStorage = true;
      return localDB.createShip(companyId, shipName, email, password);
    }
  },
  updateShip: async (shipId: string, updates: Partial<Ship>) => {
    if (useLocalStorage || !firestore) return localDB.updateShip(shipId, updates);
    try {
      await updateDoc(doc(firestore, 'ships', shipId), updates);
    } catch (e) {
      useLocalStorage = true;
      return localDB.updateShip(shipId, updates);
    }
  },
  updateShipArchived: async (shipId: string, isArchived: boolean) => {
    if (useLocalStorage || !firestore) return localDB.updateShipArchived(shipId, isArchived);
    try {
      await updateDoc(doc(firestore, 'ships', shipId), { isArchived });
    } catch (e) {
      useLocalStorage = true;
      return localDB.updateShipArchived(shipId, isArchived);
    }
  },
  authenticateVessel: async (email: string, password: string) => {
    if (useLocalStorage || !firestore) return localDB.authenticateVessel(email, password);
    try {
      const q = query(collection(firestore, 'ships'), where('email', '==', email), where('password', '==', password), where('isArchived', '==', false));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { shipId: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Ship;
    } catch (e) {
      useLocalStorage = true;
      return localDB.authenticateVessel(email, password);
    }
  },
  getReports: async (companyId: string, month: string) => {
    if (useLocalStorage || !firestore) return localDB.getReports(companyId, month);
    try {
      const q = query(collection(firestore, 'reports'), where('month', '==', month), where('companyId', '==', companyId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as MonthlyReport);
    } catch (e) {
      useLocalStorage = true;
      return localDB.getReports(companyId, month);
    }
  },
  getReport: async (companyId: string, month: string, shipId: string) => {
    if (useLocalStorage || !firestore) return localDB.getReport(companyId, month, shipId);
    try {
      const snapshot = await getDoc(doc(firestore, 'reports', `${month}_${shipId}`));
      return snapshot.exists() ? (snapshot.data() as MonthlyReport) : null;
    } catch (e) {
      useLocalStorage = true;
      return localDB.getReport(companyId, month, shipId);
    }
  },
  saveReport: async (report: MonthlyReport) => {
    if (useLocalStorage || !firestore) return localDB.saveReport(report);
    try {
      await setDoc(doc(firestore, 'reports', `${report.month}_${report.shipId}`), { ...report, updatedAt: Date.now() }, { merge: true });
    } catch (e) {
      useLocalStorage = true;
      return localDB.saveReport(report);
    }
  },
  updateReportStatus: async (month: string, shipId: string, status: ReportStatus) => {
    if (useLocalStorage || !firestore) return localDB.updateReportStatus(month, shipId, status);
    try {
      const reportId = `${month}_${shipId}`;
      const updates: any = { status, updatedAt: Date.now() };
      if (status === ReportStatus.SUBMITTED) updates.submittedAt = Date.now();
      await updateDoc(doc(firestore, 'reports', reportId), updates);
    } catch (e) {
      useLocalStorage = true;
      return localDB.updateReportStatus(month, shipId, status);
    }
  }
};
