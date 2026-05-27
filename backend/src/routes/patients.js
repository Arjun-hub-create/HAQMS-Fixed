const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const isValidPhone = (phone) => /^\+?[\d\s\-().]{7,20}$/.test(phone);

/**
 * GET /api/patients
 * FIX (Performance): Replaced full in-memory fetch + JS filter + slice pagination
 * with proper DB-level WHERE filtering and Prisma take/skip pagination.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, gender } = req.query;

    // OLD CODE:
    // const allPatients = await prisma.patient.findMany({
    //   orderBy: { createdAt: 'desc' },
    // });
    // let filteredPatients = allPatients;
    // if (search) {
    //   const query = search.toLowerCase();
    //   filteredPatients = filteredPatients.filter(
    //     (p) =>
    //       p.name.toLowerCase().includes(query) ||
    //       p.phoneNumber.includes(query) ||
    //       (p.email && p.email.toLowerCase().includes(query))
    //   );
    // }
    // if (gender && gender !== 'All') {
    //   filteredPatients = filteredPatients.filter(
    //     (p) => p.gender.toLowerCase() === gender.toLowerCase()
    //   );
    // }
    // const page = parseInt(req.query.page) || 1;
    // const limit = parseInt(req.query.limit) || 5;
    // const offset = (page - 1) * limit;
    // const paginatedResult = filteredPatients.slice(offset, offset + limit);
    // const totalPages = Math.ceil(filteredPatients.length / limit);
    // res.json({
    //   success: true,
    //   patients: paginatedResult,
    //   pagination: {
    //     page,
    //     limit,
    //     totalPatients: filteredPatients.length,
    //     totalPages,
    //   },
    // });

    // NEW CODE:
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const where = {};

    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (gender && gender !== 'All') {
      where.gender = { equals: gender, mode: 'insensitive' };
    }

    const [totalPatients, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalPatients / limit);

    res.json({
      success: true,
      data: patients,
      pagination: {
        page,
        limit,
        totalPatients,
        totalPages,
      },
    });
  } catch (error) {
    console.error('[PATIENTS] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

// GET /api/patients/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: {
          include: { doctor: { select: { id: true, name: true, specialization: true } } },
          orderBy: { appointmentDate: 'desc' },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // OLD CODE:
    // res.json(patient);

    // NEW CODE:
    res.json({ success: true, data: patient });
  } catch (error) {
    console.error('[PATIENTS] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch patient.' });
  }
});

// POST /api/patients
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phoneNumber, age, gender, medicalHistory } = req.body;

    // OLD CODE:
    // if (!name || !phoneNumber || !age || !gender) {
    //   return res.status(400).json({ error: 'Name, phoneNumber, age, and gender are required.' });
    // }
    // const patient = await prisma.patient.create({
    //   data: {
    //     name,
    //     email: email || null,
    //     phoneNumber,
    //     age: parseInt(age),
    //     gender,
    //     medicalHistory: medicalHistory || null,
    //   },
    // });
    // res.status(201).json(patient);

    // NEW CODE:
    if (!name || !phoneNumber || !age || !gender) {
      return res.status(400).json({ error: 'Name, phoneNumber, age, and gender are required.' });
    }

    // FIX: Validate phone number format to prevent garbage data
    if (!isValidPhone(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      return res.status(400).json({ error: 'Age must be a valid number between 0 and 150.' });
    }

    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({ error: `Gender must be one of: ${validGenders.join(', ')}.` });
    }

    const patient = await prisma.patient.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phoneNumber: phoneNumber.trim(),
        age: parsedAge,
        gender,
        medicalHistory: medicalHistory?.trim() || null,
      },
    });

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    console.error('[PATIENTS] Create error:', error);
    res.status(500).json({ error: 'Failed to register patient.' });
  }
});

/**
 * DELETE /api/patients/:id
 * FIX (Security - Critical): Replaced broken `authorizeAdminOnlyLegacy` (which had the
 * role check commented out) with properly enforced `authorizeAdmin` middleware.
 * Only ADMIN users can now delete patients.
 */
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    // OLD CODE (Using authorizeAdminOnlyLegacy which bypassed checks):
    // await prisma.patient.delete({ where: { id } });
    // res.json({ message: `Successfully deleted patient ${patient.name}` });

    // NEW CODE:
    await prisma.patient.delete({ where: { id } });
    res.json({ success: true, message: `Patient "${patient.name}" deleted successfully.` });
  } catch (error) {
    console.error('[PATIENTS] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete patient.' });
  }
});

module.exports = router;
