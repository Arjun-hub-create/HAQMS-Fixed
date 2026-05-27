const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/reports/doctor-stats
 * FIX (Performance - Critical): Replaced N+1 sequential loop with a single
 * aggregated query using Prisma groupBy + Promise.all for parallel execution.
 *
 * Original issues:
 * 1. Fetched all doctors, then for each doctor ran 4-5 separate DB queries sequentially
 * 2. Had an artificial 80ms sleep per doctor (e.g. 10 doctors = 800ms minimum wasted sleep)
 * 3. Total DB calls: 1 + (N doctors × 5) = up to 51 queries for 10 doctors
 *
 * Fix: Use groupBy aggregations and Promise.all to run everything in parallel.
 * Total DB calls now: 4 (regardless of doctor count)
 */
router.get('/doctor-stats', authenticate, authorize(['ADMIN', 'RECEPTIONIST']), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // FIX: Run all aggregations in parallel with Promise.all
    const [doctors, appointmentsByDoctor, queueByDoctor] = await Promise.all([
      // 1. Fetch all doctors
      prisma.doctor.findMany({
        select: { id: true, name: true, specialization: true, department: true, consultationFee: true },
        orderBy: { name: 'asc' },
      }),

      // 2. Group appointment counts by doctor and status in ONE query
      prisma.appointment.groupBy({
        by: ['doctorId', 'status'],
        _count: { id: true },
      }),

      // 3. Count today's queue tokens grouped by doctor in ONE query
      prisma.queueToken.groupBy({
        by: ['doctorId'],
        where: { createdAt: { gte: today, lt: tomorrow } },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps from aggregated results
    const appointmentMap = {};
    for (const row of appointmentsByDoctor) {
      if (!appointmentMap[row.doctorId]) {
        appointmentMap[row.doctorId] = { total: 0, COMPLETED: 0, CANCELLED: 0 };
      }
      appointmentMap[row.doctorId].total += row._count.id;
      appointmentMap[row.doctorId][row.status] = row._count.id;
    }

    const queueMap = {};
    for (const row of queueByDoctor) {
      queueMap[row.doctorId] = row._count.id;
    }

    // Assemble final report — pure in-memory join, no extra DB calls
    const reportData = doctors.map((doc) => {
      const stats = appointmentMap[doc.id] || { total: 0, COMPLETED: 0, CANCELLED: 0 };
      const revenue = (stats.COMPLETED || 0) * doc.consultationFee;

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments: stats.total,
        completedAppointments: stats.COMPLETED || 0,
        cancelledAppointments: stats.CANCELLED || 0,
        todayQueueSize: queueMap[doc.id] || 0,
        revenue,
      };
    });

    res.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error('[REPORTS] Doctor stats error:', error);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

module.exports = router;
