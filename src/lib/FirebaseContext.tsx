import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  getDocFromServer, 
  setDoc, 
  query, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User, signInAnonymously } from 'firebase/auth';
import { Student, SubjectInfo, DetailedSubjectStats, CollegeAdmission } from '../types';
import { SUBJECTS as LOCAL_SUBJECTS, STUDENTS as LOCAL_STUDENTS } from '../data';
import { HISTORICAL_GPAS as LOCAL_HISTORY } from '../historical_data';
import { ADMISSIONS_DATA as LOCAL_ADMISSIONS } from '../admissions_data';

interface FirebaseContextType {
  students: Student[];
  subjects: SubjectInfo[];
  historicalGpas: { [key: string]: any };
  admissions: CollegeAdmission[];
  allStats: { [key: string]: DetailedSubjectStats };
  isLoading: boolean;
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  updateSubject: (subject: SubjectInfo) => Promise<void>;
  updateAdmission: (admission: CollegeAdmission) => Promise<void>;
  updateHistory: (studentId: string, history: any) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [historicalGpas, setHistoricalGpas] = useState<{ [key: string]: any }>({});
  const [admissions, setAdmissions] = useState<CollegeAdmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updateStudent = async (student: Student) => {
    try {
      await setDoc(doc(db, 'students', student.id), student);
      setStudents(prev => prev.map(s => s.id === student.id ? student : s));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${student.id}`);
    }
  };

  const updateSubject = async (subject: SubjectInfo) => {
    try {
      await setDoc(doc(db, 'config/subjects/list', subject.id), subject);
      setSubjects(prev => prev.map(s => s.id === subject.id ? subject : s));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `config/subjects/list/${subject.id}`);
    }
  };

  const updateAdmission = async (admission: CollegeAdmission) => {
    try {
      await setDoc(doc(db, 'college_admissions', admission.id), admission);
      setAdmissions(prev => prev.map(a => a.id === admission.id ? admission : a));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `college_admissions/${admission.id}`);
    }
  };

  const updateHistory = async (studentId: string, history: any) => {
    try {
      await setDoc(doc(db, 'historical_data', studentId), history);
      setHistoricalGpas(prev => ({ ...prev, [studentId]: history }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `historical_data/${studentId}`);
    }
  };

  const allStats = useMemo(() => {
    const stats: { [key: string]: DetailedSubjectStats } = {};
    if (subjects.length === 0 || students.length === 0) return stats;

    subjects.forEach(sub => {
      const scores = students.map(s => s.scores[sub.id]).filter((s): s is number => s !== null);
      const sortedScores = [...scores].sort((a, b) => b - a);
      const total = scores.length;
      const avg = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(1) : "0";

      const getCut = (sorted: number[], total: number, pct: number) => {
        if (total === 0) return 0;
        const idx = Math.min(Math.ceil(total * (pct / 100)) - 1, total - 1);
        return sorted[idx];
      };

      const cuts5 = {
        1: getCut(sortedScores, total, 10),
        2: getCut(sortedScores, total, 34),
        3: getCut(sortedScores, total, 66),
        4: getCut(sortedScores, total, 90),
        5: getCut(sortedScores, total, 100),
      };

      const cuts9 = {
        1: getCut(sortedScores, total, 4),
        2: getCut(sortedScores, total, 11),
        3: getCut(sortedScores, total, 23),
        4: getCut(sortedScores, total, 40),
        5: getCut(sortedScores, total, 60),
        6: getCut(sortedScores, total, 77),
        7: getCut(sortedScores, total, 89),
        8: getCut(sortedScores, total, 96),
        9: getCut(sortedScores, total, 100),
      };

      const studentStats: { [studentId: string]: any } = {};
      students.forEach(student => {
        const score = student.scores[sub.id];
        if (score !== null && score !== undefined) {
          const rank = sortedScores.filter(s => s > score).length + 1;
          const sameScoreCount = sortedScores.filter(s => s === score).length;
          const midRank = rank + (sameScoreCount - 1) / 2;

          const getGrade = (mRank: number, totalCount: number, boundaries: number[]) => {
            for (let i = 0; i < boundaries.length; i++) {
              if (mRank <= Math.ceil((totalCount * boundaries[i]) / 100)) {
                return i + 1;
              }
            }
            return boundaries.length + 1;
          };

          const grade9Boundaries = [4, 11, 23, 40, 60, 77, 89, 96];
          const grade5Boundaries = [10, 34, 66, 90];

          const grade = getGrade(midRank, total, grade9Boundaries);
          const grade5 = getGrade(midRank, total, grade5Boundaries);

          studentStats[student.id] = {
            score,
            rank,
            percentile: parseFloat(((midRank / total) * 100).toFixed(1)),
            grade,
            grade5,
          };
        } else {
          studentStats[student.id] = {
            score: null,
            rank: null,
            percentile: null,
            grade: null,
            grade5: null,
          };
        }
      });

      stats[sub.id] = {
        id: sub.id,
        name: sub.name,
        average: parseFloat(avg),
        totalStudents: total,
        cuts5,
        cuts9,
        studentStats,
      };
    });
    return stats;
  }, [students, subjects]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        // Automatically sign in anonymously if no user is present
        signInAnonymously(auth).catch(err => {
          console.error("Anonymous sign-in failed:", err);
          setIsLoading(false);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const batch = writeBatch(db);
        let needsSeeding = false;

        // 1. Fetch Subjects
        const subjectPath = 'config/subjects/list';
        let subjectSnap;
        try {
          subjectSnap = await getDocs(collection(db, subjectPath));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, subjectPath);
        }

        let fetchedSubjects: SubjectInfo[] = [];
        if (subjectSnap.empty) {
          needsSeeding = true;
          for (const sub of LOCAL_SUBJECTS) {
            batch.set(doc(db, subjectPath, sub.id), sub);
          }
          fetchedSubjects = LOCAL_SUBJECTS;
        } else {
          fetchedSubjects = subjectSnap.docs.map(d => d.data() as SubjectInfo);
        }
        setSubjects(fetchedSubjects);

        // 2. Fetch Students
        const studentPath = 'students';
        let studentSnap;
        try {
          studentSnap = await getDocs(collection(db, studentPath));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, studentPath);
        }

        let fetchedStudents: Student[] = [];
        if (studentSnap.size < LOCAL_STUDENTS.length) {
          needsSeeding = true;
          for (const s of LOCAL_STUDENTS) {
             batch.set(doc(db, studentPath, s.id), s);
          }
          fetchedStudents = LOCAL_STUDENTS;
        } else {
          fetchedStudents = studentSnap.docs.map(d => d.data() as Student);
        }
        setStudents(fetchedStudents.sort((a,b) => a.id.localeCompare(b.id)));

        // 3. Fetch History
        const historyPath = 'historical_data';
        let historySnap;
        try {
          historySnap = await getDocs(collection(db, historyPath));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, historyPath);
        }

        let fetchedHistory: any = {};
        const localKeys = Object.keys(LOCAL_HISTORY);
        
        // If database is empty or we want to ensure latest file data is synced
        if (historySnap.empty) {
          needsSeeding = true;
          for (const id of localKeys) {
            batch.set(doc(db, historyPath, id), LOCAL_HISTORY[id]);
            fetchedHistory[id] = LOCAL_HISTORY[id];
          }
        } else {
          // Normal load
          historySnap.docs.forEach(d => {
            fetchedHistory[d.id] = d.data();
          });

          // Check if key members (like 2101) match the new corrected records. 
          // If not, we trigger a re-sync for everyone in the local file to fix errors.
          const checkIds = ["2101", "2102", "2103"];
          const needsCorrection = checkIds.some(id => {
            const remote = fetchedHistory[id];
            const local = LOCAL_HISTORY[id];
            return !remote || remote["1-1-9"] !== local["1-1-9"] || remote["1-2-9"] !== local["1-2-9"];
          });

          if (needsCorrection) {
            console.log("Detecting data mismatch in historical records. Syncing with corrected local data...");
            needsSeeding = true;
            for (const id of localKeys) {
              batch.set(doc(db, historyPath, id), LOCAL_HISTORY[id]);
              fetchedHistory[id] = LOCAL_HISTORY[id];
            }
          }
        }
        setHistoricalGpas(fetchedHistory);

        // 4. Fetch Admissions
        const admissionsPath = 'college_admissions';
        let admissionsSnap;
        try {
          admissionsSnap = await getDocs(collection(db, admissionsPath));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, admissionsPath);
        }

        let fetchedAdmissions: CollegeAdmission[] = [];
        if (admissionsSnap.empty) {
          needsSeeding = true;
          for (const adm of LOCAL_ADMISSIONS) {
            batch.set(doc(db, admissionsPath, adm.id), adm);
          }
          fetchedAdmissions = LOCAL_ADMISSIONS;
        } else {
          fetchedAdmissions = admissionsSnap.docs.map(d => d.data() as CollegeAdmission);
        }
        setAdmissions(fetchedAdmissions);

        if (needsSeeding) {
          console.log("Seeding all data to Firebase...");
          try {
            await batch.commit();
            console.log("Seeding complete.");
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, "BATCH_SEED");
          }
        }

      } catch (error) {
        console.error("Firebase Initialization Error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user]);

  return (
    <FirebaseContext.Provider value={{ 
      students, 
      subjects, 
      historicalGpas, 
      admissions, 
      allStats, 
      isLoading, 
      user, 
      signIn, 
      signOut,
      updateStudent,
      updateSubject,
      updateAdmission,
      updateHistory
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
