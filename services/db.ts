import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  limit,
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
  apiKey: 'AIzaSyBK9L2VCiHkF-Mb_uCbjgevyPLdrWGaQkM',
  authDomain: 'provisionfollowup.firebaseapp.com',
  projectId: 'provisionfollowup',
  storageBucket: 'provisionfollowup.firebasestorage.app',
  messagingSenderId: '921802121277',
  appId: '1:921802121277:web:9e9a06f4b735927aaa8a54',
};

// --- App init (primary)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// --- Secondary app (create vessel users without logging out company)
const secondaryApp =
  getApps().find((a) => a.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
const secondaryAuth: Auth = getAuth(secondaryApp);

// --- Paths
const userDoc = (uid: string) => doc(firestore, 'users', uid);

const companyDoc = (companyId: string) => doc(firestore, 'companies', companyId);
const shipsCol = (companyId: string) => collection(firestore, 'companies', companyId, 'ships');
const shipDoc = (companyId: string, shipId: string) => doc(firestore, 'companies', companyId, 'ships', shipId);

const reportsCol = (companyId: string) => collection(firestore, 'companies', companyId, 'reports');
const reportDoc = (companyId: string, reportId: string) => doc(firestore, 'companies', companyId, 'reports', reportId);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const db = {
  // backward-compat
  isLocal: () => false,

  // ----------------
  // AUTH / LOGIN
  // ----------------
  loginAny: async (email: string, password: string): Promise<UserProfile> => {
    const cleanEmail = normalizeEmail(email);

    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const uid = cred.user.uid;

    // 1) Try profile
    const snap = await getDoc(userDoc(uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    // 2) Profile missing → try to recover vessel profile by ship.authUid == uid
    // (This is the exact fix for your "vessel login after register gives error" issue.)
    const qShip = query(collectionGroup(firestore, 'ships'), where('authUid', '==', uid), limit(1));
    const shipSnap = await getDocs(qShip);

    if (!shipSnap.empty) {
      const shipData = shipSnap.docs[0].data() as any;

      const recovered: UserProfile = {
        uid,
        email: cred.user.email || cleanEmail,
        role: UserRole.VESSEL,
        companyId: shipData.companyId,
        shipId: shipSnap.docs[0].id,
        shipName: shipData.shipName,
      };

      // write missing profile for next logins
      await setDoc(userDoc(uid), recovered, { merge: true });
      return recovered;
    }

    // 3) Could be a company user who never ran createCompanyAfterAuth (rare)
    // We don't auto-create company here because you already have signup flow.
    throw new Error('Profile not found in Firestore (users). Run Company Signup or fix vessel profile creation.');
  },

  logout: async () => {
    await signOut(auth);
  },

  // ----------------
  // COMPANY
  // ----------------
  createCompanyAfterAuth: async (companyName: string): Promise<UserProfile> => {
    const current = auth.currentUser;
    if (!current) throw new Error('Not authenticated.');

    const companyId = current.uid;

    const payload: Company = {
      companyId,
      name: companyName,
      adminUid: current.uid,
      createdAt: Date.now(),
    };

    await setDoc(companyDoc(companyId), payload, { merge: true });

    const profile: UserProfile = {
      uid: current.uid,
      email: current.email || '',
      role: UserRole.COMPANY,
      companyId,
    };

    await setDoc(userDoc(current.uid), profile, { merge: true });
    return profile;
  },

  getCompany: async (companyId: string): Promise<Company | null> => {
    const snap = await getDoc(companyDoc(companyId));
    return snap.exists() ? (snap.data() as Company) : null;
  },

  // ----------------
  // SHIPS
  // ----------------
  getShips: async (companyId: string): Promise<Ship[]> => {
    const snap = await getDocs(shipsCol(companyId));
    return snap.docs.map((d) => ({ shipId: d.id, ...(d.data() as Omit<Ship, 'shipId'>) }));
  },

  createShip: async (companyId: string, shipName: string, email: string, password: string): Promise<Ship> => {
    const cleanEmail = normalizeEmail(email);

    // 1) Create vessel auth user (secondary auth)
    const vesselCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password);
    const vesselUid = vesselCred.user.uid;

    // Cleanup secondary session (optional but clean)
    await signOut(secondaryAuth);

    // 2) Create ship doc
    const ref = doc(shipsCol(companyId));

    const newShip: Ship = {
      shipId: ref.id,
      shipName,
      email: cleanEmail,
      authUid: vesselUid,
      active: true,
      isArchived: false,
      companyId,

      // password is optional in types; DO NOT store it (Auth already handles it)
      // password: undefined,
    };

    await setDoc(ref, newShip, { merge: true });

    // 3) Create vessel profile in users/{uid}  (single ID = vesselUid)
    const vesselProfile: UserProfile = {
      uid: vesselUid,
      email: cleanEmail,
      role: UserRole.VESSEL,
      companyId,
      shipId: ref.id,
      shipName,
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

  // ----------------
  // REPORTS
  // ----------------
  getReports: async (companyId: string, month: string): Promise<MonthlyReport[]> => {
    const q = query(reportsCol(companyId), where('month', '==', month));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as MonthlyReport);
  },

  getReport: async (companyId: string, month: string, shipId: string): Promise<MonthlyReport | null> => {
    const rid = `${month}_${shipId}`;
    const snap = await getDoc(reportDoc(companyId, rid));
    return snap.exists() ? (snap.data() as MonthlyReport) : null;
  },

  saveReport: async (report: MonthlyReport): Promise<void> => {
    // report.companyId MUST be set by UI
    const rid = `${report.month}_${report.shipId}`;

    // IMPORTANT: keep shipAuthUid in report for rules
    if (!report.companyId) throw new Error('report.companyId is missing');
    if (!report.shipAuthUid) throw new Error('report.shipAuthUid is missing');

    await setDoc(
      reportDoc(report.companyId, rid),
      { ...report, updatedAt: Date.now() },
      { merge: true }
    );
  },

  updateReportStatus: async (
    companyId: string,
    month: string,
    shipId: string,
    status: ReportStatus
  ): Promise<void> => {
    const rid = `${month}_${shipId}`;
    const updates: any = { status, updatedAt: Date.now() };
    if (status === ReportStatus.SUBMITTED) updates.submittedAt = Date.now();
    await updateDoc(reportDoc(companyId, rid), updates);
  },
};

export default db;
