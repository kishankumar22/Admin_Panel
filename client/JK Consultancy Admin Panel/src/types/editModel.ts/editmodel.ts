interface StudentFormData {
    StudentId: number;
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
    ModifiedBy: string;
    SessionYear: string;
    PaymentMode: string;
    NumberOfEMI: number | null;
    emiDetails: Array<{ emiNumber: number; amount: number; dueDate: string }>;
    stdCollId: string;
  }
  
  interface FileData {
    file: File | null;
    preview: string | null;
  }
  
  interface Documents {
    StudentImage: FileData;
    CasteCertificate: FileData;
    TenthMarks: FileData;
    TwelfthMarks: FileData;
    Residential: FileData;
    Income: FileData;
  }
  
  interface College {
    id: number;
    collegeName: string;
  }
  
  interface Course {
    id: number;
    courseName: string;
    courseDuration: number;
  }
  
  interface ExistingDocument {
    DocumentId: number;
    DocumentType: string;
    FileName: string;
    Url: string;
    PublicId: string;
  }
  
  interface AcademicHistory {
    id: string;
    courseYear: string;
    sessionYear: string;
    adminAmount: number;
    paymentMode: string;
    numberOfEMI?: number;
    feesAmount: number;
    ledgerNumber?: string;
    createdOn: string | Date;
    createdBy?: string;
    modifiedOn?: string | Date;
    modifiedBy?: string;
    emiDetails: Array<{ emiNumber: number; amount: number; dueDate: string }>;
  }