/**
 * seed.js — Populates the HAQMS database with realistic demo data.
 *
 * Creates:
 *   - 3 Users (Admin, Receptionist, Doctor) with pre-hashed passwords
 *   - 5 Doctors across different specializations
 *   - 8 Patients with varied demographics
 *   - 6 Appointments across doctors
 *   - 4 Queue tokens for today
 *
 * All seeded user passwords: "password123"
 *
 * Run: node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting HAQMS database seed...\n');

  // ──────────────────────────────────────────
  // 1. USERS (password for all: "password123")
  // ──────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@haqms.com' },
    update: {},
    create: {
      email: 'admin@haqms.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { email: 'reception1@haqms.com' },
    update: {},
    create: {
      email: 'reception1@haqms.com',
      password: hashedPassword,
      name: 'Sarah Chen',
      role: 'RECEPTIONIST',
    },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor1@haqms.com' },
    update: {},
    create: {
      email: 'doctor1@haqms.com',
      password: hashedPassword,
      name: 'Dr. Rajesh Kumar',
      role: 'DOCTOR',
    },
  });

  console.log('✅ Users seeded:', [admin.email, receptionist.email, doctorUser.email].join(', '));

  // ──────────────────────────────────────────
  // 2. DOCTORS
  // ──────────────────────────────────────────
  const doctorsData = [
    { name: 'Dr. Rajesh Kumar',    specialization: 'Cardiology',      department: 'Internal Medicine', consultationFee: 500, experience: 15, availableFrom: '09:00', availableTo: '17:00' },
    { name: 'Dr. Priya Sharma',    specialization: 'Dermatology',     department: 'Outpatient',        consultationFee: 400, experience: 10, availableFrom: '10:00', availableTo: '18:00' },
    { name: 'Dr. Michael Adams',   specialization: 'Orthopedics',     department: 'Surgery',           consultationFee: 600, experience: 20, availableFrom: '08:00', availableTo: '16:00' },
    { name: 'Dr. Emily Zhang',     specialization: 'Pediatrics',      department: 'Pediatrics',        consultationFee: 350, experience: 8,  availableFrom: '09:00', availableTo: '17:00' },
    { name: 'Dr. James Wilson',    specialization: 'General Medicine', department: 'Internal Medicine', consultationFee: 300, experience: 12, availableFrom: '08:30', availableTo: '16:30' },
  ];

  const doctors = [];
  for (const doc of doctorsData) {
    // Use upsert based on name to avoid duplicates on re-seed
    const existing = await prisma.doctor.findFirst({ where: { name: doc.name } });
    if (existing) {
      doctors.push(existing);
    } else {
      const created = await prisma.doctor.create({ data: doc });
      doctors.push(created);
    }
  }

  console.log(`✅ Doctors seeded: ${doctors.length} physicians`);

  // ──────────────────────────────────────────
  // 3. PATIENTS
  // ──────────────────────────────────────────
  const patientsData = [
    { name: 'Amit Patel',       email: 'amit.patel@email.com',    phoneNumber: '+91-9876543210', age: 45, gender: 'Male',   medicalHistory: 'Type 2 Diabetes, Hypertension' },
    { name: 'Sneha Reddy',      email: 'sneha.r@email.com',       phoneNumber: '+91-9123456780', age: 32, gender: 'Female', medicalHistory: 'Asthma, seasonal allergies' },
    { name: 'John Doe',         email: 'john.doe@email.com',      phoneNumber: '+1-555-0101',    age: 58, gender: 'Male',   medicalHistory: 'Previous cardiac stent (2022), high cholesterol' },
    { name: 'Maria Gonzalez',   email: 'maria.g@email.com',       phoneNumber: '+1-555-0202',    age: 27, gender: 'Female', medicalHistory: null },
    { name: 'Ravi Shankar',     email: null,                       phoneNumber: '+91-8001234567', age: 70, gender: 'Male',   medicalHistory: 'Arthritis, knee replacement surgery (2020)' },
    { name: 'Fatima Khan',      email: 'fatima.k@email.com',      phoneNumber: '+91-7890123456', age: 5,  gender: 'Female', medicalHistory: 'Childhood vaccinations up to date' },
    { name: 'David Park',       email: 'david.park@email.com',    phoneNumber: '+82-10-1234-5678', age: 38, gender: 'Male', medicalHistory: null },
    { name: 'Ananya Iyer',      email: 'ananya.iyer@email.com',   phoneNumber: '+91-9988776655', age: 22, gender: 'Female', medicalHistory: 'Mild eczema' },
  ];

  const patients = [];
  for (const pat of patientsData) {
    const existing = await prisma.patient.findFirst({ where: { name: pat.name } });
    if (existing) {
      patients.push(existing);
    } else {
      const created = await prisma.patient.create({ data: pat });
      patients.push(created);
    }
  }

  console.log(`✅ Patients seeded: ${patients.length} records`);

  // ──────────────────────────────────────────
  // 4. APPOINTMENTS
  // ──────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointmentsData = [
    { patientIdx: 0, doctorIdx: 0, hoursFromNow: 1,   reason: 'Routine cardiac checkup',         status: 'PENDING' },
    { patientIdx: 1, doctorIdx: 1, hoursFromNow: 2,   reason: 'Skin rash follow-up',             status: 'PENDING' },
    { patientIdx: 2, doctorIdx: 0, hoursFromNow: 3,   reason: 'Post-stent review',               status: 'CONFIRMED' },
    { patientIdx: 4, doctorIdx: 2, hoursFromNow: 1.5, reason: 'Knee pain assessment',             status: 'PENDING' },
    { patientIdx: 5, doctorIdx: 3, hoursFromNow: 4,   reason: 'Vaccination booster',              status: 'PENDING' },
    { patientIdx: 3, doctorIdx: 4, hoursFromNow: 2.5, reason: 'General wellness examination',     status: 'CONFIRMED' },
  ];

  const existingAppointments = await prisma.appointment.count();
  if (existingAppointments === 0) {
    for (const app of appointmentsData) {
      const appointmentDate = new Date();
      appointmentDate.setHours(appointmentDate.getHours() + app.hoursFromNow);

      await prisma.appointment.create({
        data: {
          patientId: patients[app.patientIdx].id,
          doctorId: doctors[app.doctorIdx].id,
          appointmentDate,
          reason: app.reason,
          status: app.status,
        },
      });
    }
    console.log(`✅ Appointments seeded: ${appointmentsData.length} bookings`);
  } else {
    console.log(`⏭️  Appointments already exist (${existingAppointments}), skipping.`);
  }

  // ──────────────────────────────────────────
  // 5. QUEUE TOKENS (today)
  // ──────────────────────────────────────────
  const existingTokens = await prisma.queueToken.count();
  if (existingTokens === 0) {
    const queueData = [
      { patientIdx: 0, doctorIdx: 0, tokenNumber: 1, status: 'COMPLETED' },
      { patientIdx: 2, doctorIdx: 0, tokenNumber: 2, status: 'CALLING' },
      { patientIdx: 4, doctorIdx: 2, tokenNumber: 1, status: 'WAITING' },
      { patientIdx: 1, doctorIdx: 1, tokenNumber: 1, status: 'WAITING' },
    ];

    for (const q of queueData) {
      await prisma.queueToken.create({
        data: {
          tokenNumber: q.tokenNumber,
          patientId: patients[q.patientIdx].id,
          doctorId: doctors[q.doctorIdx].id,
          status: q.status,
        },
      });
    }
    console.log(`✅ Queue tokens seeded: ${queueData.length} tokens`);
  } else {
    console.log(`⏭️  Queue tokens already exist (${existingTokens}), skipping.`);
  }

  console.log('\n🎉 HAQMS database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
