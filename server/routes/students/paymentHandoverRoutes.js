const express = require('express');
const { sql, executeQuery } = require('../../config/db');
const router = express.Router();
const bcrypt = require('bcrypt');

// Get all payments
router.get('/amountType', async (req, res) => {
  try {
    const query = `
      SELECT 
        sp.id, sp.amount, sp.amountType, sp.paymentMode, sp.receivedDate, 
        sp.transactionNumber, sp.courseYear, sp.sessionYear,
        s.id AS studentId, s.fName, s.lName, s.rollNumber, s.mobileNumber, s.email,
        c.courseName,
        col.collegeName,
        sa.id AS studentAcademicId, sa.sessionYear AS saSessionYear, sa.feesAmount, 
        sa.adminAmount, sa.paymentMode AS saPaymentMode, sa.courseYear AS saCourseYear
      FROM StudentPayment sp
      LEFT JOIN Student s ON sp.studentId = s.id
      LEFT JOIN Course c ON s.courseId = c.id
      LEFT JOIN College col ON s.collegeId = col.id
      LEFT JOIN StudentAcademicDetails sa ON sp.studentAcademicId = sa.id
    `;
    const result = await executeQuery(query);
    const payments = result.recordset.map(record => ({
      id: record.id,
      amount: record.amount,
      amountType: record.amountType,
      paymentMode: record.paymentMode,
      receivedDate: record.receivedDate,
      transactionNumber: record.transactionNumber,
      courseYear: record.courseYear,
      sessionYear: record.sessionYear,
      student: {
        id: record.studentId,
        fName: record.fName,
        lName: record.lName,
        rollNumber: record.rollNumber,
        mobileNumber: record.mobileNumber,
        email: record.email,
        course: { courseName: record.courseName },
        college: { collegeName: record.collegeName },
      },
      studentAcademic: {
        id: record.studentAcademicId,
        sessionYear: record.saSessionYear,
        feesAmount: record.feesAmount,
        adminAmount: record.adminAmount,
        paymentMode: record.saPaymentMode,
        courseYear: record.saCourseYear,
      },
    }));
    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
});

// Get unique approvedBy values for "Received By" dropdown
router.get('/approved-by', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT approvedBy, receivedDate
      FROM StudentPayment
      WHERE approvedBy IS NOT NULL
    `;
    const result = await executeQuery(query);
    const approvedByList = result.recordset.map(record => ({
      approvedBy: record.approvedBy,
      receivedDate: record.receivedDate,
    }));
    res.status(200).json({
      success: true,
      data: approvedByList,
    });
  } catch (error) {
    console.error('Error fetching approvedBy list:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approvedBy list',
      error: error.message,
    });
  }
});

// Get payments by staff member (approvedBy) - Includes remaining amount
router.get('/payments-by-staff/:staffName', async (req, res) => {
  try {
    const { staffName } = req.params;
    const query = `
      SELECT 
        sp.id, sp.studentId, sp.studentAcademicId, sp.paymentMode, sp.transactionNumber,
        sp.amount, sp.handoverAmount, sp.receivedDate, sp.approvedBy, sp.amountType,
        sp.receiptUrl, sp.receiptPublicId, sp.courseYear, sp.sessionYear,
        sp.createdBy, sp.createdOn, sp.modifiedBy, sp.modifiedOn,
        s.id AS sId, s.stdCollId, s.fName, s.lName, s.rollNumber, s.gender, s.fatherName,
        s.motherName, s.mobileNumber, s.fatherMobile, s.alternateNumber, s.dob, s.email,
        s.address, s.state, s.pincode, s.city, s.admissionMode, s.collegeId, s.courseId,
        s.admissionDate, s.studentImage, s.category, s.isDiscontinue, s.isLateral,
        s.discontinueOn, s.discontinueBy, s.createdBy AS sCreatedBy, s.createdOn AS sCreatedOn,
        s.modifiedBy AS sModifiedBy, s.modifiedOn AS sModifiedOn, s.status AS sStatus,
        c.id AS cId, c.courseName, c.collegeId AS cCollegeId, c.courseDuration,
        c.createdBy AS cCreatedBy, c.createdOn AS cCreatedOn, c.modifiedBy AS cModifiedBy,
        c.modifiedOn AS cModifiedOn, c.status AS cStatus,
        col.id AS colId, col.collegeName, col.location, col.establishYear, col.contactNumber,
        col.email AS colEmail, col.status AS colStatus, col.createdBy AS colCreatedBy,
        col.createdOn AS colCreatedOn, col.modifiedBy AS colModifiedBy, col.modifiedOn AS colModifiedOn,
        sa.id AS saId, sa.studentId AS saStudentId, sa.sessionYear AS saSessionYear,
        sa.paymentMode AS saPaymentMode, sa.adminAmount, sa.feesAmount, sa.numberOfEMI,
        sa.ledgerNumber, sa.courseYear AS saCourseYear, sa.createdBy AS saCreatedBy,
        sa.createdOn AS saCreatedOn, sa.modifiedBy AS saModifiedBy, sa.modifiedOn AS saModifiedOn
      FROM StudentPayment sp
      LEFT JOIN Student s ON sp.studentId = s.id
      LEFT JOIN Course c ON s.courseId = c.id
      LEFT JOIN College col ON s.collegeId = col.id
      LEFT JOIN StudentAcademicDetails sa ON sp.studentAcademicId = sa.id
      WHERE sp.approvedBy = @staffName AND sp.amount IS NOT NULL
    `;
    const params = { staffName: { type: sql.NVarChar, value: staffName } };
    const result = await executeQuery(query, params);
    const processedPayments = result.recordset
      .map(record => {
        const amountValue = record.amount || 0;
        const handoverAmountValue = record.handoverAmount || 0;
        const remainingAmount = amountValue - handoverAmountValue;
        return {
          id: record.id,
          studentId: record.studentId,
          studentAcademicId: record.studentAcademicId,
          paymentMode: record.paymentMode,
          transactionNumber: record.transactionNumber,
          amount: record.amount,
          handoverAmount: record.handoverAmount,
          receivedDate: record.receivedDate,
          approvedBy: record.approvedBy,
          amountType: record.amountType,
          receiptUrl: record.receiptUrl,
          receiptPublicId: record.receiptPublicId,
          courseYear: record.courseYear,
          sessionYear: record.sessionYear,
          createdBy: record.createdBy,
          createdOn: record.createdOn,
          modifiedBy: record.modifiedBy,
          modifiedOn: record.modifiedOn,
          student: {
            id: record.sId,
            stdCollId: record.stdCollId,
            fName: record.fName,
            lName: record.lName,
            rollNumber: record.rollNumber,
            gender: record.gender,
            fatherName: record.fatherName,
            motherName: record.motherName,
            mobileNumber: record.mobileNumber,
            fatherMobile: record.fatherMobile,
            alternateNumber: record.alternateNumber,
            dob: record.dob,
            email: record.email,
            address: record.address,
            state: record.state,
            pincode: record.pincode,
            city: record.city,
            admissionMode: record.admissionMode,
            collegeId: record.collegeId,
            courseId: record.courseId,
            admissionDate: record.admissionDate,
            studentImage: record.studentImage,
            category: record.category,
            isDiscontinue: record.isDiscontinue,
            isLateral: record.isLateral,
            discontinueOn: record.discontinueOn,
            discontinueBy: record.discontinueBy,
            createdBy: record.sCreatedBy,
            createdOn: record.sCreatedOn,
            modifiedBy: record.sModifiedBy,
            modifiedOn: record.sModifiedOn,
            status: record.sStatus,
            course: {
              id: record.cId,
              courseName: record.courseName,
              collegeId: record.cCollegeId,
              courseDuration: record.courseDuration,
              createdBy: record.cCreatedBy,
              createdOn: record.cCreatedOn,
              modifiedBy: record.cModifiedBy,
              modifiedOn: record.cModifiedOn,
              status: record.cStatus,
            },
            college: {
              id: record.colId,
              collegeName: record.collegeName,
              location: record.location,
              establishYear: record.establishYear,
              contactNumber: record.contactNumber,
              email: record.colEmail,
              status: record.colStatus,
              createdBy: record.colCreatedBy,
              createdOn: record.colCreatedOn,
              modifiedBy: record.colModifiedBy,
              modifiedOn: record.colModifiedOn,
            },
          },
          studentAcademic: {
            id: record.saId,
            studentId: record.saStudentId,
            sessionYear: record.saSessionYear,
            paymentMode: record.saPaymentMode,
            adminAmount: record.adminAmount,
            feesAmount: record.feesAmount,
            numberOfEMI: record.numberOfEMI,
            ledgerNumber: record.ledgerNumber,
            courseYear: record.saCourseYear,
            createdBy: record.saCreatedBy,
            createdOn: record.saCreatedOn,
            modifiedBy: record.saModifiedBy,
            modifiedOn: record.saModifiedOn,
          },
          remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
        };
      })
      .filter(payment => payment.remainingAmount > 0);
    res.json({
      success: true,
      data: processedPayments,
    });
  } catch (error) {
    console.error('Error fetching payments by staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments by staff',
      error: error.message,
    });
  }
});

// Create a payment handover record - Updated for partial handovers
router.post('/payment-handovers', async (req, res) => {
  try {
    const { paymentData, handedOverTo, handoverDate, remarks, createdBy } = req.body;
    const handovers = [];
    for (const payment of paymentData) {
      const paymentId = parseInt(payment.id);
      const handoverAmount = parseFloat(payment.handoverAmount);
      if (isNaN(paymentId) || isNaN(handoverAmount) || handoverAmount <= 0) {
        throw new Error(`Invalid handover amount for payment ID ${paymentId}`);
      }
      // Get the payment record
      const paymentQuery = `
        SELECT amount, handoverAmount, studentId, approvedBy
        FROM StudentPayment
        WHERE id = @paymentId
      `;
      const paymentParams = { paymentId: { type: sql.Int, value: paymentId } };
      const paymentResult = await executeQuery(paymentQuery, paymentParams);
      const paymentRecord = paymentResult.recordset[0];
      if (!paymentRecord) {
        throw new Error(`Payment with ID ${paymentId} not found`);
      }
      const currentAmount = paymentRecord.amount || 0;
      const currentHandoverAmount = paymentRecord.handoverAmount || 0;
      // Validate handover amount
      if (currentHandoverAmount + handoverAmount > currentAmount) {
        throw new Error(`Cannot hand over more than the available amount for payment ID ${paymentId}`);
      }
      // Update the payment record
      const updateQuery = `
        UPDATE StudentPayment
        SET handoverAmount = @newHandoverAmount, modifiedBy = @modifiedBy, modifiedOn = @modifiedOn
        WHERE id = @paymentId
      `;
      const updateParams = {
        newHandoverAmount: { type: sql.Decimal(10, 2), value: currentHandoverAmount + handoverAmount },
        modifiedBy: { type: sql.NVarChar, value: createdBy },
        modifiedOn: { type: sql.DateTime, value: new Date() },
        paymentId: { type: sql.Int, value: paymentId },
      };
      await executeQuery(updateQuery, updateParams);
      // Create the handover record
      const insertQuery = `
        INSERT INTO PaymentHandover (
          paymentId, studentId, amount, receivedBy, handedOverTo, handoverDate, remarks,
          verified, verifiedBy, verifiedOn, createdBy, createdOn
        )
        OUTPUT INSERTED.*
        VALUES (
          @paymentId, @studentId, @amount, @receivedBy, @handedOverTo, @handoverDate, @remarks,
          @verified, @verifiedBy, @verifiedOn, @createdBy, @createdOn
        )
      `;
      const insertParams = {
        paymentId: { type: sql.Int, value: paymentId },
        studentId: { type: sql.Int, value: paymentRecord.studentId },
        amount: { type: sql.Decimal(10, 2), value: handoverAmount },
        receivedBy: { type: sql.NVarChar, value: paymentRecord.approvedBy },
        handedOverTo: { type: sql.NVarChar, value: handedOverTo },
        handoverDate: { type: sql.DateTime, value: new Date(handoverDate) },
        remarks: { type: sql.NVarChar, value: remarks },
        verified: { type: sql.Bit, value: 1 },
        verifiedBy: { type: sql.NVarChar, value: createdBy },
        verifiedOn: { type: sql.DateTime, value: new Date() },
        createdBy: { type: sql.NVarChar, value: createdBy },
        createdOn: { type: sql.DateTime, value: new Date() },
      };
      const insertResult = await executeQuery(insertQuery, insertParams);
      handovers.push(insertResult.recordset[0]);
    }
    res.json({
      success: true,
      data: handovers,
    });
  } catch (error) {
    console.error('Error creating payment handovers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment handovers',
      error: error.message,
    });
  }
});

// Get all payment handovers
router.get('/payment-handovers', async (req, res) => {
  try {
    const query = `
      SELECT 
        ph.id, ph.paymentId, ph.studentId, ph.amount, ph.receivedBy, ph.handedOverTo,
        ph.handoverDate, ph.remarks, ph.verified, ph.verifiedBy, ph.verifiedOn,
        ph.createdBy, ph.createdOn,
        sp.id AS spId, sp.studentId AS spStudentId, sp.studentAcademicId, sp.paymentMode,
        sp.transactionNumber, sp.amount AS spAmount, sp.handoverAmount, sp.receivedDate,
        sp.approvedBy, sp.amountType, sp.receiptUrl, sp.receiptPublicId, sp.courseYear,
        sp.sessionYear, sp.createdBy AS spCreatedBy, sp.createdOn AS spCreatedOn,
        sp.modifiedBy AS spModifiedBy, sp.modifiedOn AS spModifiedOn,
        s.id AS sId, s.stdCollId, s.fName, s.lName, s.rollNumber, s.gender, s.fatherName,
        s.motherName, s.mobileNumber, s.fatherMobile, s.alternateNumber, s.dob, s.email,
        s.address, s.state, s.pincode, s.city, s.admissionMode, s.collegeId, s.courseId,
        s.admissionDate, s.studentImage, s.category, s.isDiscontinue, s.isLateral,
        s.discontinueOn, s.discontinueBy, s.createdBy AS sCreatedBy, s.createdOn AS sCreatedOn,
        s.modifiedBy AS sModifiedBy, s.modifiedOn AS sModifiedOn, s.status AS sStatus,
        c.id AS cId, c.courseName, c.collegeId AS cCollegeId, c.courseDuration,
        c.createdBy AS cCreatedBy, c.createdOn AS cCreatedOn, c.modifiedBy AS cModifiedBy,
        c.modifiedOn AS cModifiedOn, c.status AS cStatus,
        col.id AS colId, col.collegeName, col.location, col.establishYear, col.contactNumber,
        col.email AS colEmail, col.status AS colStatus, col.createdBy AS colCreatedBy,
        col.createdOn AS colCreatedOn, col.modifiedBy AS colModifiedBy, col.modifiedOn AS colModifiedOn
      FROM PaymentHandover ph
      LEFT JOIN StudentPayment sp ON ph.paymentId = sp.id
      LEFT JOIN Student s ON ph.studentId = s.id
      LEFT JOIN Course c ON s.courseId = c.id
      LEFT JOIN College col ON s.collegeId = col.id
      ORDER BY ph.createdOn DESC
    `;
    const result = await executeQuery(query);
    const handovers = result.recordset.map(record => ({
      id: record.id,
      paymentId: record.paymentId,
      studentId: record.studentId,
      amount: record.amount,
      receivedBy: record.receivedBy,
      handedOverTo: record.handedOverTo,
      handoverDate: record.handoverDate,
      remarks: record.remarks,
      verified: record.verified,
      verifiedBy: record.verifiedBy,
      verifiedOn: record.verifiedOn,
      createdBy: record.createdBy,
      createdOn: record.createdOn,
      payment: {
        id: record.spId,
        studentId: record.spStudentId,
        studentAcademicId: record.studentAcademicId,
        paymentMode: record.paymentMode,
        transactionNumber: record.transactionNumber,
        amount: record.spAmount,
        handoverAmount: record.handoverAmount,
        receivedDate: record.receivedDate,
        approvedBy: record.approvedBy,
        amountType: record.amountType,
        receiptUrl: record.receiptUrl,
        receiptPublicId: record.receiptPublicId,
        courseYear: record.courseYear,
        sessionYear: record.sessionYear,
        createdBy: record.spCreatedBy,
        createdOn: record.spCreatedOn,
        modifiedBy: record.spModifiedBy,
        modifiedOn: record.spModifiedOn,
      },
      student: {
        id: record.sId,
        stdCollId: record.stdCollId,
        fName: record.fName,
        lName: record.lName,
        rollNumber: record.rollNumber,
        gender: record.gender,
        fatherName: record.fatherName,
        motherName: record.motherName,
        mobileNumber: record.mobileNumber,
        fatherMobile: record.fatherMobile,
        alternateNumber: record.alternateNumber,
        dob: record.dob,
        email: record.email,
        address: record.address,
        state: record.state,
        pincode: record.pincode,
        city: record.city,
        admissionMode: record.admissionMode,
        collegeId: record.collegeId,
        courseId: record.courseId,
        admissionDate: record.admissionDate,
        studentImage: record.studentImage,
        category: record.category,
        isDiscontinue: record.isDiscontinue,
        isLateral: record.isLateral,
        discontinueOn: record.discontinueOn,
        discontinueBy: record.discontinueBy,
        createdBy: record.sCreatedBy,
        createdOn: record.sCreatedOn,
        modifiedBy: record.sModifiedBy,
        modifiedOn: record.sModifiedOn,
        status: record.sStatus,
        course: {
          id: record.cId,
          courseName: record.courseName,
          collegeId: record.cCollegeId,
          courseDuration: record.courseDuration,
          createdBy: record.cCreatedBy,
          createdOn: record.cCreatedOn,
          modifiedBy: record.cModifiedBy,
          modifiedOn: record.cModifiedOn,
          status: record.cStatus,
        },
        college: {
          id: record.colId,
          collegeName: record.collegeName,
          location: record.location,
          establishYear: record.establishYear,
          contactNumber: record.contactNumber,
          email: record.colEmail,
          status: record.colStatus,
          createdBy: record.colCreatedBy,
          createdOn: record.colCreatedOn,
          modifiedBy: record.colModifiedBy,
          modifiedOn: record.colModifiedOn,
        },
      },
    }));
    res.json({
      success: true,
      data: handovers,
    });
  } catch (error) {
    console.error('Error fetching payment handovers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment handovers',
      error: error.message,
    });
  }
});

// Verify a payment handover (kept for backward compatibility)
router.put('/payment-handovers/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedBy } = req.body;
    const query = `
      UPDATE PaymentHandover
      SET verified = @verified, verifiedBy = @verifiedBy, verifiedOn = @verifiedOn
      WHERE id = @id
      SELECT *
      FROM PaymentHandover
      WHERE id = @id
    `;
    const params = {
      id: { type: sql.Int, value: parseInt(id) },
      verified: { type: sql.Bit, value: 1 },
      verifiedBy: { type: sql.NVarChar, value: verifiedBy },
      verifiedOn: { type: sql.DateTime, value: new Date() },
    };
    const result = await executeQuery(query, params);
    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error) {
    console.error('Error verifying payment handover:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment handover',
      error: error.message,
    });
  }
});

// Verify password
router.post('/verify-password', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ success: false, message: 'User ID and password are required' });
  }

  try {
    const query = `
      SELECT password
      FROM [User]
      WHERE user_id = @userId
    `;
    const params = { userId: { type: sql.Int, value: userId } };
    const result = await executeQuery(query, params);

    const user = result.recordset[0];
    if (!user || !user.password) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    return res.json({ success: true, message: 'Password verified' });
  } catch (error) {
    console.error('Password verification error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

module.exports = router;