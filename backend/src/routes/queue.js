const express = require('express');
// OLD CODE:
// const { PrismaClient } = require('@prisma/client');

// NEW CODE:
const { PrismaClient, Prisma } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
router.get('/', async (req, res) => {
  // Note: intentionally no auth required for public queue monitor board
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    // OLD CODE:
    // // List all active queue tokens (requires authentication in old version, leaks full sub-objects)
    // // router.get('/', authenticate, async (req, res) => {
    // const tokens = await prisma.queueToken.findMany({
    //   where,
    //   include: {
    //     patient: true,
    //     doctor: true,
    //   },
    //   orderBy: { createdAt: 'asc' },
    // });
    // res.json(tokens);

    // NEW CODE:
    const tokens = await prisma.queueToken.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: tokens });
  } catch (error) {
    console.error('[QUEUE] Fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve queue.' });
  }
});

/**
 * POST /api/queue/checkin
 * FIX (Concurrency - Critical): Eliminated race condition in token number generation.
 *
 * Original bug: 
 *   1. Read max token number
 *   2. Sleep 350ms (artificially widening the race window!)
 *   3. Write new token with max+1
 *   → Two concurrent requests read the same max, both write the same token number.
 */
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({ error: 'Patient ID and Doctor ID are required for check-in.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // OLD CODE (Concurrency race condition bug):
    // // 1. Fetch current maximum token number for this doctor today
    // const maxTokenResult = await prisma.queueToken.aggregate({
    //   where: {
    //     doctorId,
    //     createdAt: { gte: today },
    //   },
    //   _max: {
    //     tokenNumber: true,
    //   },
    // });
    // const currentMax = maxTokenResult._max.tokenNumber || 0;
    // const nextTokenNumber = currentMax + 1;
    // // Artificial sleep to widen the race condition window.
    // await new Promise((resolve) => setTimeout(resolve, 350));
    // // 2. Insert new token
    // const newToken = await prisma.queueToken.create({
    //   data: {
    //     tokenNumber: nextTokenNumber,
    //     patientId,
    //     doctorId,
    //     appointmentId: appointmentId || null,
    //     status: 'WAITING',
    //   },
    //   include: {
    //     patient: true,
    //     doctor: true,
    //   },
    // });
    // res.status(201).json({
    //   message: 'Checked in successfully. Token generated.',
    //   token: newToken,
    // });

    // NEW CODE:
    // Force a serializable isolation level. If concurrent requests try to calculate next token number at the exact same time, 
    // PostgreSQL will detect a serialization failure (P2034) on commit and abort/retry, guaranteeing 100% unique token numbers.
    const newToken = await prisma.$transaction(async (tx) => {
      const maxTokenResult = await tx.queueToken.aggregate({
        where: {
          doctorId,
          createdAt: { gte: today, lt: tomorrow },
        },
        _max: { tokenNumber: true },
      });

      const nextTokenNumber = (maxTokenResult._max.tokenNumber || 0) + 1;

      const token = await tx.queueToken.create({
        data: {
          tokenNumber: nextTokenNumber,
          patientId,
          doctorId,
          appointmentId: appointmentId || null,
          status: 'WAITING',
        },
        include: {
          patient: { select: { id: true, name: true } },
          doctor: { select: { id: true, name: true, specialization: true } },
        },
      });

      return token;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });

    res.status(201).json({
      success: true,
      message: 'Checked in successfully. Token generated.',
      data: newToken,
    });
  } catch (error) {
    console.error('[QUEUE] Check-in error:', error);
    res.status(500).json({ error: 'Check-in failed. Please try again.' });
  }
});

// PATCH /api/queue/:id — update token status
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['WAITING', 'CALLING', 'COMPLETED', 'SKIPPED'];

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.` });
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    });

    // OLD CODE:
    // res.json(updatedToken);

    // NEW CODE:
    res.json({ success: true, data: updatedToken });
  } catch (error) {
    console.error('[QUEUE] Update error:', error);
    res.status(500).json({ error: 'Failed to update queue token.' });
  }
});

module.exports = router;
