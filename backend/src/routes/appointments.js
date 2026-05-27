const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/appointments
 * FIX (Performance - Critical): Eliminated N+1 query problem.
 * Fix: Use Prisma's `include` to JOIN in a single query.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    // OLD CODE (N+1 database queries):
    // // Fetch core appointments
    // const appointments = await prisma.appointment.findMany({
    //   where,
    //   orderBy: { appointmentDate: 'asc' },
    // });
    // const detailedAppointments = [];
    // for (const app of appointments) {
    //   console.log(`[N+1 DB QUERY] Fetching Patient (${app.patientId}) and Doctor (${app.doctorId}) for Appointment ${app.id}`);
    //   const patient = await prisma.patient.findUnique({
    //     where: { id: app.patientId },
    //   });
    //   const doctor = await prisma.doctor.findUnique({
    //     where: { id: app.doctorId },
    //   });
    //   detailedAppointments.push({
    //     ...app,
    //     patient: patient ? { id: patient.id, name: patient.name, phoneNumber: patient.phoneNumber, age: patient.age, medicalHistory: patient.medicalHistory } : null,
    //     doctor: doctor ? { id: doctor.id, name: doctor.name, specialization: doctor.specialization } : null,
    //   });
    // }
    // res.json({
    //   success: true,
    //   count: detailedAppointments.length,
    //   appointments: detailedAppointments,
    // });

    // NEW CODE:
    // FIX: Single query with JOINs via include — no more loop queries
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: 'asc' },
      include: {
        patient: {
          select: { id: true, name: true, phoneNumber: true, age: true, medicalHistory: true },
        },
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error('[APPOINTMENTS] Fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

/**
 * POST /api/appointments
 * FIX (Database): Replaced flawed millisecond-precision duplicate check.
 * Fix: Block any booking for the same doctor within a 30-minute window.
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json({ error: 'Patient ID, Doctor ID, and appointment date are required.' });
    }

    const appDate = new Date(appointmentDate);
    if (isNaN(appDate.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date format.' });
    }

    // OLD CODE:
    // // Flawed duplicate check:
    // // It only checks if the exact millisecond matches. If the candidate books for "2026-05-25 10:00:00"
    // // and another for "2026-05-25 10:00:01", they are treated as unique!
    // const existingBooking = await prisma.appointment.findFirst({
    //   where: {
    //     doctorId,
    //     appointmentDate: appDate,
    //     status: { not: 'CANCELLED' },
    //   },
    // });
    // if (existingBooking) {
    //   return res.status(400).json({
    //     error: 'Double booking blocked. Doctor already has an appointment at this exact millisecond.',
    //   });
    // }

    // NEW CODE:
    // FIX: Block bookings within a 30-minute window for the same doctor
    const SLOT_WINDOW_MINUTES = 30;
    const windowStart = new Date(appDate.getTime() - SLOT_WINDOW_MINUTES * 60 * 1000);
    const windowEnd = new Date(appDate.getTime() + SLOT_WINDOW_MINUTES * 60 * 1000);

    const conflictingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: { not: 'CANCELLED' },
      },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        error: `Scheduling conflict. Doctor already has an appointment within 30 minutes of the requested time.`,
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: appDate,
        reason: reason?.trim() || '',
        status: 'PENDING',
      },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      data: appointment,
    });
  } catch (error) {
    console.error('[APPOINTMENTS] Create error:', error);
    res.status(500).json({ error: 'Failed to book appointment.' });
  }
});

// PATCH /api/appointments/:id — update status
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.` });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });

    // OLD CODE:
    // res.json(updated);

    // NEW CODE:
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[APPOINTMENTS] Update error:', error);
    res.status(500).json({ error: 'Failed to update appointment.' });
  }
});

module.exports = router;
