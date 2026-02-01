import { initializeApp, getApps, getApp } from 'firebase/app';
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
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { ReportStatus, MonthlyReport, Ship, Company, UserProfile, UserRole } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyBK9L2VCiHkF-Mb_uCbjgevyPLdrWGaQkM",
  authDomain: "provisionfollowup.firebaseapp.com",
  projectId: "provisionfollowup",
  storageBucket: "provisionfollowup.firebasestorage.app",
  messagingSenderId: "921802121277",
  appId: "1:921802121277:web:9e9a06f4b735927aaa8a54"
};

// --- App init
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// --- Secondary app (create vessel users without logging out admin)
const secondaryApp =
  getApps().find(a => a.name === 'secondary')
    ? getApps().find(a => a.name === 'secondary')!
    : initializeApp(firebaseConfig, 'secondary');

const secondaryAuth: Auth = getAuth(secondaryApp);

// --- Paths
const userDoc = (uid: string) => doc(firestore, 'users', uid);

const companyDoc = (companyId: string) => doc(firestore, 'companies', companyId);
const shipsCol = (companyId: string) => collection(firestore, 'companies', companyId, 'ships');
const shipDoc = (companyId: string, shipId: string) => doc(firestore, 'companies', companyId, 'ships', shipId);

const reportsCol = (companyId: string) => collection(firestore, 'companies', companyId, 'reports');
const reportDoc = (companyId: string, reportId: string) => doc(firestore, 'companies', companyId, 'reports', reportId);

export const db = {
  // Backward-compat
  isLocal: () => false,

  // -----------
  // LOGIN (Company + Vessel)
  // -----------
  loginAny: async (email: string, password: string): Promise<UserProfile> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;

    const snap = await getDoc(userDoc(uid));
    if (!snap.exists()) throw new Error('Profile not found in Firestore (users).');

    return snap.data() as UserProfile;
  },

  logout: async () => {
    await signOut(auth);
  },

  // -----------
  // COMPANY
  // -----------
  createCompanyAfterAuth: async (companyName: string): Promise<UserProfile> => {
    const current = auth.currentUser;
    if (!current) throw new Error('Not authenticated.');

    const companyId = current.uid;

    const payload: Company = {
      companyId,
      name: companyName,
      adminUid: current.uid,
      createdAt: Date.now()
    };

    await setDoc(companyDoc(companyId), payload, { merge: true });

    const profile: UserProfile = {
      uid: current.uid,
      email: current.email || '',
      role: UserRole.COMPANY,
      companyId
    };

    await setDoc(userDoc(current.uid), profile, { merge: true });
    return profile;
  },

  getCompany: async (companyId: string): Promise<Company | null> => {
    const snap = await getDoc(companyDoc(companyId));
    return snap.exists() ? (snap.data() as Company) : null;
  },

  // -----------
  // SHIPS
  // -----------
  getShips: async (companyId: string): Promise<Ship[]> => {
    const snap = await getDocs(shipsCol(companyId));
    return snap.docs.map(d => ({ shipId: d.id, ...(d.data() as Omit<Ship, 'shipId'>) }));
  },

  createShip: async (companyId: string, shipName: string, email: string, password: string): Promise<Ship> => {
    // 1) Create vessel auth user (secondary auth)
    const vesselCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const vesselUid = vesselCred.user.uid;

    // cleanup secondary
    await signOut(secondaryAuth);

    // 2) Create ship doc
    const ref = doc(shipsCol(companyId));
    const newShip: Ship = {
      shipId: ref.id,
      shipName,
      email,
      password,
      authUid: vesselUid,
      active: true,
      isArchived: false,
      companyId
    };

    await setDoc(ref, newShip);

    // 3) Create vessel profile
    const vesselProfile: UserProfile = {
      uid: vesselUid,
      email,
      role: UserRole.VESSEL,
      companyId,
      shipId: ref.id,
      shipName
    };

    await setDoc(userDoc(vesselUid), vesselProfile, { merge: true });

    return newShip;
  },

  updateShip: async (companyId: string, shipId: string, updates: Partial<Ship>): Promise<void> => {
    await updateDoc(shipDoc(companyId, shipId), updates as any);
  },

  updateShipArchived: async (companyId: string, shipId: string, isArchived: boolean): Promise<void> => {
    await updateDoc(shipDoc(companyId, shipId), { isArchived } as any);
  },

  // -----------
  // REPORTS
  // -----------
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

export default db;
