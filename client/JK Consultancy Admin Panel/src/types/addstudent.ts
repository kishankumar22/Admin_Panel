export interface StudentFormData {
  RollNumber: string;
  FName: string;
  LName: string;
  DOB: string;
  Gender: string;
  MobileNumber: string;
  AlternateNumber: string;
  EmailId: string;
  FatherName: string;
  FatherMobileNumber: string;
  MotherName: string;
  Address: string;
  City: string;
  State: string;
  Pincode: string;
  CourseId: string;
  CourseYear: string;
  Category: string;
  LedgerNumber: string;
  CollegeId: string;
  AdmissionMode: string;
  AdmissionDate: string;
  IsDiscontinue: boolean;
  DiscontinueOn: string;
  DiscontinueBy: string;
  FineAmount: number;
  RefundAmount: number;
  CreatedBy: string;
  SessionYear: string;
  PaymentMode: string;
  NumberOfEMI: number | null;
  isLateral: boolean;
}

export interface FileData {
  file: File | null;
  preview: string | null;
}

export interface Documents {
  StudentImage: FileData;
  CasteCertificate: FileData;
  TenthMarks: FileData;
  TwelfthMarks: FileData;
  Residential: FileData;
  Income: FileData;
}

export interface College {
  id: number;
  collegeName: string;
}

export interface Course {
  id: number;
  courseName: string;
  courseDuration: number;
}

 export interface StudentFromApi {
  email: string;
  rollNumber: string;
}