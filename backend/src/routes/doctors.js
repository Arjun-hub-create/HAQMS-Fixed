const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/doctors
 * FIX (Security - Critical): Rewrote SQL injection vulnerable endpoint.
 * Fix: Replaced raw query with Prisma's type-safe findMany() with proper where clauses.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;

    // OLD CODE:
    // let query = 'SELECT * FROM "Doctor"';
    // const conditions = [];
    // if (search) {
    //   // Direct string interpolation - VULNERABLE TO SQL INJECTION!
    //   conditions.push(`name ILIKE '%${search}%'`);
    // }
    // if (specialization && specialization !== 'All') {
    //   conditions.push(`specialization = '${specialization}'`);
    // }
    // if (conditions.length > 0) {
    //   query += ' WHERE ' + conditions.join(' AND ');
    // }
    // console.log(`[SQL-DEBUG] Executing Query: ${query}`);
    // const doctors = await prisma.$queryRawUnsafe(query);
    // res.json(doctors);

    // NEW CODE:
    const where = {};

    if (search) {
      // FIX: Using Prisma's 'contains' with 'mode: insensitive' — parameterized, injection-safe
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (specialization && specialization !== 'All') {
      // FIX: Parameterized exact match — no injection possible
      where.specialization = specialization;
    }

    const doctors = await prisma.doctor.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: doctors });
  } catch (error) {
    console.error('[DOCTORS] Fetch error:', error);
    // FIX: Do not leak SQL error messages
    res.status(500).json({ error: 'Failed to retrieve doctors.' });
  }
});

/**
 * GET /api/doctors/stats
 * FIX (Performance): Replaced sequential awaits with Promise.all()
 * Fix: Run queries concurrently — dramatically faster under load.
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // OLD CODE:
    // const start = Date.now();
    // const totalDoctors = await prisma.doctor.count();
    // const surgeonsCount = await prisma.doctor.count({
    //   where: { department: 'Surgery' },
    // });
    // const averageFee = await prisma.doctor.aggregate({
    //   _avg: {
    //     consultationFee: true,
    //   },
    // });
    // const highestExperience = await prisma.doctor.aggregate({
    //   _max: {
    //     experience: true,
    //   },
    // });
    // const durationMs = Date.now() - start;
    // res.json({
    //   success: true,
    //   data: {
    //     total: totalDoctors,
    //     surgeons: surgeonsCount,
    //     averageFee: Math.round(averageFee._avg.consultationFee || 0),
    //     maxExperience: highestExperience._max.experience || 0,
    //   },
    //   debugInfo: {
    //     executionTimeMs: durationMs,
    //     notes: 'Loaded sequentially for safety. Optimization needed.'
    //   }
    // });

    // NEW CODE:
    // FIX: All independent queries run in parallel
    const [totalDoctors, surgeonsCount, averageFeeResult, highestExperienceResult] =
      await Promise.all([
        prisma.doctor.count(),
        prisma.doctor.count({ where: { department: 'Surgery' } }),
        prisma.doctor.aggregate({ _avg: { consultationFee: true } }),
        prisma.doctor.aggregate({ _max: { experience: true } }),
      ]);

    res.json({
      success: true,
      data: {
        total: totalDoctors,
        surgeons: surgeonsCount,
        averageFee: Math.round(averageFeeResult._avg.consultationFee || 0),
        maxExperience: highestExperienceResult._max.experience || 0,
      },
    });
  } catch (error) {
    console.error('[DOCTORS] Stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve doctor statistics.' });
  }
});

// GET /api/doctors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    // OLD CODE:
    // res.json(doctor);

    // NEW CODE:
    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('[DOCTORS] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve doctor.' });
  }
});

module.exports = router;
