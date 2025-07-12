export interface AcademicDetail {
  id: number;
  studentId: number;
  sessionYear: string;
  paymentMode: string;
  adminAmount: number;
  feesAmount: number;
  numberOfEMI: number | null;
  ledgerNumber: string | null;
  courseYear: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string | null;
}

export interface Course {
  id: [number, number];
  courseName: string;
  collegeId: number;
  courseDuration: number;
  createdBy: string;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string | null;
  status: boolean;
}

export interface Student {
  id: number;
  fName: string;
  lName: string | null;
  course: Course;
  academicDetails: AcademicDetail[];
}

export interface Placement {
  studentimage: string | undefined;
  CreatedBy: string;
  CreatedOn: string | number | Date;
  ModifiedBy: string;
  ModifiedOn: any;
  PlacementId: number;
  StudentAcademicId: number;
  CompanyName: string;
  RoleOffered: string;
  PackageOffered: number;
  PlacementYear: number;
  Status: 'Selected' | 'Joined' | 'Offer Received';
  Remarks?: string;
  fName?: string;
  lName?: string;
}

export interface FormData {
  studentAcademicId: string;
  company: string;
  role: string;
  package: string;
  year: string;
  status: 'Selected' | 'Joined' | 'Offer Received';
  remarks: string;
  CreatedBy: string;
  ModifiedBy: string;
}