
interface EmiDetail {
  id: number;
  studentId: number;
  studentAcademicId: number;
  emiNumber: number;
  amount: number;
  dueDate: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string | null;
}

interface AcademicDetail {
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
  emiDetails: EmiDetail[];
}

interface Student {
  id: number;
  rollNumber: string;
  fName: string;
  lName: string | null;
  email: string;
  mobileNumber: string;
  fatherName: string;
  status: boolean;
  isDiscontinue: boolean;
  admissionMode: string;
  category: string;
  gender: string;
  address: string;
  pincode: string;
  dob: string;
  admissionDate: string;
  discontinueBy: string | null;
  stdCollId?: string;
  course: {
    courseName: string;
    id?: number;
  };
  college: {
    collegeName: string;
    id?: number;
  };
  academicDetails: AcademicDetail[];
  emiDetails: EmiDetail[];
}

interface StudentPayment {
  id: number;
  studentId: number;
  amount: number;
  amountType: string;
  // Other fields as needed
}

interface SummaryData {
  totalStudents: number;
  adminAmount: number;
  adminReceived: number;
  adminPending: number;
  feesAmount: number;
  feesReceived: number;
  feesPending: number;
}
