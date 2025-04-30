const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const bcrypt = require('bcrypt');

// Get all payments
router.get('/amountType', async (req, res) => {
  try {
    const payments = await prisma.studentPayment.findMany({
      include: {
        student: {
          include: {
            course: true,
            college: true,
          },
        },
        studentAcademic: true,
      },
    });
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

// New endpoint: Get unique approvedBy values for "Received By" dropdown
router.get('/approved-by', async (req, res) => {
  try {
    const approvedByList = await prisma.studentPayment.findMany({
      select: {
        approvedBy: true,
      },
      distinct: ['approvedBy'],
      where: {
        approvedBy: {
          not: null,
        },
      },
    });
    res.status(200).json({
      success: true,
      data: approvedByList.filter(item => item.approvedBy).map(item => ({ approvedBy: item.approvedBy })),
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

// Get payments by staff member (approvedBy) - Modified to include remaining amount
router.get('/payments-by-staff/:staffName', async (req, res) => {
  try {
    const { staffName } = req.params;
    const payments = await prisma.studentPayment.findMany({
      where: {
        approvedBy: staffName,
        // Only get payments that have a non-null amount
        amount: {
          not: null,
        },
      },
      include: {
        student: {
          include: {
            course: true,
            college: true,
          },
        },
        studentAcademic: true,
      },
    });
    // Process the payments to filter out fully handed over ones and calculate remaining amounts
    const processedPayments = payments.map(payment => {
      const amountValue = payment.amount || 0;
      const handoverAmountValue = payment.handoverAmount || 0;
      const remainingAmount = amountValue - handoverAmountValue;
      return {
        ...payment,
        remainingAmount: remainingAmount > 0 ? remainingAmount : 0
      };
    }).filter(payment => payment.remainingAmount > 0); // Only include payments with remaining amounts
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
    // Start a transaction to ensure all updates are done together
    const handovers = await prisma.$transaction(async (prisma) => {
      const handoverRecords = [];
      for (const payment of paymentData) {
        const paymentId = parseInt(payment.id);
        const handoverAmount = parseFloat(payment.handoverAmount);
        if (isNaN(paymentId) || isNaN(handoverAmount) || handoverAmount <= 0) {
          throw new Error(`Invalid handover amount for payment ID ${paymentId}`);
        }
        // Get the payment record
        const paymentRecord = await prisma.studentPayment.findUnique({
          where: { id: paymentId },
          include: { student: true },
        });
        if (!paymentRecord) {
          throw new Error(`Payment with ID ${paymentId} not found`);
        }
        const currentAmount = paymentRecord.amount || 0;
        const currentHandoverAmount = paymentRecord.handoverAmount || 0;
        // Make sure we're not handing over more than the available amount
        if (currentHandoverAmount + handoverAmount > currentAmount) {
          throw new Error(`Cannot hand over more than the available amount for payment ID ${paymentId}`);
        }
        // Update the payment record with the new handover amount
        await prisma.studentPayment.update({
          where: { id: paymentId },
          data: {
            handoverAmount: currentHandoverAmount + handoverAmount,
            modifiedBy: createdBy,
            modifiedOn: new Date(),
          },
        });
        // Create the handover record
        const handover = await prisma.paymentHandover.create({
          data: {
            paymentId: paymentId,
            studentId: paymentRecord.studentId,
            amount: handoverAmount,
            receivedBy: paymentRecord.approvedBy,
            handedOverTo,
            handoverDate: new Date(handoverDate),
            remarks,
            verified: true, // Auto-verify when created
            verifiedBy: createdBy,
            verifiedOn: new Date(),
            createdBy,
            createdOn: new Date(),
          },
        });
        handoverRecords.push(handover);
      }
      return handoverRecords;
    });
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
    const handovers = await prisma.paymentHandover.findMany({
      include: {
        payment: true,
        student: {
          include: {
            course: true,
            college: true,
          },
        },
      },
      orderBy: {
        createdOn: 'desc', // Show newest first
      },
    });
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

// Verify a payment handover (not needed anymore as handovers are auto-verified, but kept for backward compatibility)
router.put('/payment-handovers/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedBy } = req.body;
    const handover = await prisma.paymentHandover.update({
      where: { id: parseInt(id) },
      data: {
        verified: true,
        verifiedBy,
        verifiedOn: new Date(),
      },
    });
    res.json({
      success: true,
      data: handover,
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

router.post('/verify-password', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ success: false, message: 'User ID and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

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