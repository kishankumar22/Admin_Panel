export interface AcademicDetail {
    id: number;
    courseYear?: string;
    sessionYear?: string;
    paymentMode?: string;
    adminAmount?: number;
    feesAmount?: number;
    ledgerNumber?: string;
    createdOn: string;
  }
  
  export interface EmiDetail {
    id: number;
    emiNumber: number;
    amount: number;
    dueDate: string;
  }
  
  export interface Document {
    id: number;
    documentType: string;
    fileName: string;
    fileUrl: string;
  }
  
  export interface Student {
    id: number;
    rollNumber: string;
    fName: string;
    lName: string | null;
    email: string;
    mobileNumber: string;
    fatherName: string;
    fatherMobile?: string;
    motherName?: string;
    alternateNumber?: string;
    dob?: string;
    gender?: string;
    category: string;
    admissionMode: string;
    status: boolean;
    isDiscontinue: boolean;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    admissionDate?: string;
    studentImage?: string;
    course: {
      courseName: string;
    };
    college: {
      collegeName: string;
    };
    academicDetails: AcademicDetail[];
    emiDetails?: EmiDetail[];
    documents?: Document[];
    createdOn: string;
  }
  