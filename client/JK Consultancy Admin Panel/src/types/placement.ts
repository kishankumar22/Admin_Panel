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
  status: boolean;
  id: number;
  fName: string;
  lName: string | null;
  course: Course;
  academicDetails: AcademicDetail[];
}

export interface Placement {
  courseName: string;
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
  StudentPic?: File | null;

}

export interface FormData {
  studentAcademicId: number;
  company: string;
  role: string;
  package: string;
  year: string;
  status: 'Selected' | 'Joined' | 'Offer Received';
  remarks: string;
  CreatedBy: string;
  ModifiedBy: string;
   StudentPic?: File | null;
}

