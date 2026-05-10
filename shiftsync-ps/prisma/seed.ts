import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  UserStatus,
  Skill,
  ShiftStatus,
  UserLocationType,
  AssignmentStatus,
} from '@db';
import * as argon2 from 'argon2';
import { addDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

// Week of Monday May 12, 2025
const THIS_WEEK_MON = '2025-05-12';

// ─── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding ShiftSync database...');

  const PASSWORD = await argon2.hash('Password123!');

  // ── Locations ──────────────────────────────────────────────────────────────

  await prisma.location.upsert({
    where: { id: 'loc_downtown' },
    update: {},
    create: {
      id: 'loc_downtown',
      name: 'Coastal Eats — Downtown',
      address: '450 Market St',
      city: 'San Francisco',
      state: 'CA',
      timezone: 'America/Los_Angeles',
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { id: 'loc_mission' },
    update: {},
    create: {
      id: 'loc_mission',
      name: 'Coastal Eats — Mission',
      address: '2100 Mission St',
      city: 'San Francisco',
      state: 'CA',
      timezone: 'America/Los_Angeles',
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { id: 'loc_nyc' },
    update: {},
    create: {
      id: 'loc_nyc',
      name: 'Coastal Eats — Midtown NYC',
      address: '555 8th Ave',
      city: 'New York',
      state: 'NY',
      timezone: 'America/New_York',
      isActive: true,
    },
  });

  await prisma.location.upsert({
    where: { id: 'loc_boston' },
    update: {},
    create: {
      id: 'loc_boston',
      name: 'Coastal Eats — Boston Back Bay',
      address: '200 Boylston St',
      city: 'Boston',
      state: 'MA',
      timezone: 'America/New_York',
      isActive: true,
    },
  });

  console.log('✅ Locations created');

  // ── Users ─────────────────────────────────────────────────────────────────

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@coastal-eats.com' },
    update: {},
    create: {
      id: 'user_admin',
      email: 'admin@coastal-eats.com',
      passwordHash: PASSWORD,
      firstName: 'Alex',
      lastName: 'Chen',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      timezone: 'America/Los_Angeles',
    },
  });

  // Managers
  const managerSF = await prisma.user.upsert({
    where: { email: 'manager.sf@coastal-eats.com' },
    update: {},
    create: {
      id: 'user_mgr_sf',
      email: 'manager.sf@coastal-eats.com',
      passwordHash: PASSWORD,
      firstName: 'Jordan',
      lastName: 'Rivera',
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      timezone: 'America/Los_Angeles',
    },
  });

  const managerNYC = await prisma.user.upsert({
    where: { email: 'manager.nyc@coastal-eats.com' },
    update: {},
    create: {
      id: 'user_mgr_nyc',
      email: 'manager.nyc@coastal-eats.com',
      passwordHash: PASSWORD,
      firstName: 'Taylor',
      lastName: 'Kim',
      role: UserRole.MANAGER,
      status: UserStatus.ACTIVE,
      timezone: 'America/New_York',
    },
  });

  // Staff — 20 staff members with varied skills and certifications
  const staffData = [
    // SF-based bartenders
    {
      id: 'user_sarah',
      email: 'sarah@coastal-eats.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      tz: 'America/Los_Angeles',
      skills: [Skill.BARTENDER, Skill.BARBACK],
      locations: ['loc_downtown', 'loc_mission'],
      desiredHours: 35,
    },
    {
      id: 'user_marcus',
      email: 'marcus@coastal-eats.com',
      firstName: 'Marcus',
      lastName: 'Thompson',
      tz: 'America/Los_Angeles',
      skills: [Skill.BARTENDER, Skill.SERVER],
      locations: ['loc_downtown'],
      desiredHours: 40,
    },
    {
      id: 'user_elena',
      email: 'elena@coastal-eats.com',
      firstName: 'Elena',
      lastName: 'Vasquez',
      tz: 'America/Los_Angeles',
      skills: [Skill.BARTENDER, Skill.HOST],
      locations: ['loc_mission', 'loc_downtown'],
      desiredHours: 30,
    },

    // SF-based servers
    {
      id: 'user_james',
      email: 'james@coastal-eats.com',
      firstName: 'James',
      lastName: 'Park',
      tz: 'America/Los_Angeles',
      skills: [Skill.SERVER, Skill.HOST],
      locations: ['loc_downtown', 'loc_mission'],
      desiredHours: 35,
    },
    {
      id: 'user_priya',
      email: 'priya@coastal-eats.com',
      firstName: 'Priya',
      lastName: 'Patel',
      tz: 'America/Los_Angeles',
      skills: [Skill.SERVER],
      locations: ['loc_downtown'],
      desiredHours: 20,
    },
    {
      id: 'user_carlos',
      email: 'carlos@coastal-eats.com',
      firstName: 'Carlos',
      lastName: 'Mendez',
      tz: 'America/Los_Angeles',
      skills: [Skill.SERVER, Skill.BARTENDER],
      locations: ['loc_mission'],
      desiredHours: 40,
    },

    // SF-based kitchen
    {
      id: 'user_aisha',
      email: 'aisha@coastal-eats.com',
      firstName: 'Aisha',
      lastName: 'Williams',
      tz: 'America/Los_Angeles',
      skills: [Skill.COOK, Skill.LINE_COOK],
      locations: ['loc_downtown', 'loc_mission'],
      desiredHours: 40,
    },
    {
      id: 'user_dmitri',
      email: 'dmitri@coastal-eats.com',
      firstName: 'Dmitri',
      lastName: 'Volkov',
      tz: 'America/Los_Angeles',
      skills: [Skill.LINE_COOK],
      locations: ['loc_downtown'],
      desiredHours: 35,
    },
    {
      id: 'user_nina',
      email: 'nina@coastal-eats.com',
      firstName: 'Nina',
      lastName: 'Okafor',
      tz: 'America/Los_Angeles',
      skills: [Skill.COOK, Skill.LINE_COOK],
      locations: ['loc_mission'],
      desiredHours: 32,
    },

    // SF host/barback
    {
      id: 'user_wei',
      email: 'wei@coastal-eats.com',
      firstName: 'Wei',
      lastName: 'Zhang',
      tz: 'America/Los_Angeles',
      skills: [Skill.HOST, Skill.BARBACK],
      locations: ['loc_downtown', 'loc_mission'],
      desiredHours: 25,
    },

    // NYC-based staff
    {
      id: 'user_maria',
      email: 'maria@coastal-eats.com',
      firstName: 'Maria',
      lastName: 'Santos',
      tz: 'America/New_York',
      skills: [Skill.BARTENDER, Skill.SERVER],
      locations: ['loc_nyc', 'loc_boston'],
      desiredHours: 40,
    },
    {
      id: 'user_john',
      email: 'john@coastal-eats.com',
      firstName: 'John',
      lastName: 'Murphy',
      tz: 'America/New_York',
      skills: [Skill.SERVER, Skill.HOST],
      locations: ['loc_nyc'],
      desiredHours: 35,
    },
    {
      id: 'user_keisha',
      email: 'keisha@coastal-eats.com',
      firstName: 'Keisha',
      lastName: 'Brown',
      tz: 'America/New_York',
      skills: [Skill.BARTENDER],
      locations: ['loc_nyc', 'loc_boston'],
      desiredHours: 30,
    },
    {
      id: 'user_omar',
      email: 'omar@coastal-eats.com',
      firstName: 'Omar',
      lastName: 'Hassan',
      tz: 'America/New_York',
      skills: [Skill.COOK, Skill.LINE_COOK],
      locations: ['loc_nyc'],
      desiredHours: 40,
    },
    {
      id: 'user_sophie',
      email: 'sophie@coastal-eats.com',
      firstName: 'Sophie',
      lastName: 'Laurent',
      tz: 'America/New_York',
      skills: [Skill.SERVER, Skill.BARTENDER],
      locations: ['loc_boston'],
      desiredHours: 25,
    },

    // Cross-timezone certified staff (SF + NYC locations)
    {
      id: 'user_liam',
      email: 'liam@coastal-eats.com',
      firstName: 'Liam',
      lastName: "O'Brien",
      tz: 'America/Los_Angeles',
      skills: [Skill.BARTENDER, Skill.SERVER],
      locations: ['loc_downtown', 'loc_nyc'],
      desiredHours: 40,
    },

    // Staff approaching weekly hour limits
    {
      id: 'user_alex',
      email: 'alex.s@coastal-eats.com',
      firstName: 'Alex',
      lastName: 'Stewart',
      tz: 'America/Los_Angeles',
      skills: [Skill.SERVER, Skill.HOST],
      locations: ['loc_downtown', 'loc_mission'],
      desiredHours: 40,
    },

    // Additional staff
    {
      id: 'user_fiona',
      email: 'fiona@coastal-eats.com',
      firstName: 'Fiona',
      lastName: 'Walsh',
      tz: 'America/New_York',
      skills: [Skill.HOST, Skill.SERVER],
      locations: ['loc_nyc', 'loc_boston'],
      desiredHours: 30,
    },
    {
      id: 'user_rashid',
      email: 'rashid@coastal-eats.com',
      firstName: 'Rashid',
      lastName: 'Ahmed',
      tz: 'America/Los_Angeles',
      skills: [Skill.BARBACK, Skill.COOK],
      locations: ['loc_mission'],
      desiredHours: 20,
    },
    {
      id: 'user_tamika',
      email: 'tamika@coastal-eats.com',
      firstName: 'Tamika',
      lastName: 'Robinson',
      tz: 'America/New_York',
      skills: [Skill.COOK, Skill.SERVER],
      locations: ['loc_boston'],
      desiredHours: 35,
    },
  ];

  const createdStaff: any[] = [];

  for (const s of staffData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        id: s.id,
        email: s.email,
        passwordHash: PASSWORD,
        firstName: s.firstName,
        lastName: s.lastName,
        role: UserRole.STAFF,
        status: UserStatus.ACTIVE,
        timezone: s.tz,
        desiredWeeklyHours: s.desiredHours,
      },
    });

    // Skills
    await prisma.userSkill.deleteMany({ where: { userId: user.id } });
    for (const skill of s.skills) {
      await prisma.userSkill.create({ data: { userId: user.id, skill } });
    }

    // Certifications
    await prisma.userLocation.deleteMany({
      where: { userId: user.id, type: UserLocationType.CERTIFIED },
    });
    for (const locationId of s.locations) {
      await prisma.userLocation.create({
        data: { userId: user.id, locationId, type: UserLocationType.CERTIFIED },
      });
    }

    // Default weekly availability (Mon–Sun)
    await prisma.availability.deleteMany({ where: { userId: user.id } });
    const availStart = '09:00';
    const availEnd = '23:00';
    for (let day = 0; day <= 6; day++) {
      // Staff with desired <= 25h: not available Friday evenings (for fairness scenario)
      if (s.desiredHours && s.desiredHours <= 25 && day === 5) continue;
      await prisma.availability.create({
        data: { userId: user.id, dayOfWeek: day, startTime: availStart, endTime: availEnd },
      });
    }

    createdStaff.push(user);
  }

  console.log(`✅ ${createdStaff.length} staff created`);

  // ── Manager location assignments ──────────────────────────────────────────

  await prisma.userLocation.deleteMany({ where: { userId: managerSF.id } });
  await prisma.userLocation.createMany({
    data: [
      { userId: managerSF.id, locationId: 'loc_downtown', type: UserLocationType.MANAGED },
      { userId: managerSF.id, locationId: 'loc_mission', type: UserLocationType.MANAGED },
    ],
  });

  await prisma.userLocation.deleteMany({ where: { userId: managerNYC.id } });
  await prisma.userLocation.createMany({
    data: [
      { userId: managerNYC.id, locationId: 'loc_nyc', type: UserLocationType.MANAGED },
      { userId: managerNYC.id, locationId: 'loc_boston', type: UserLocationType.MANAGED },
    ],
  });

  console.log('✅ Manager assignments created');

  // ── Shifts — this week (Mon May 12) ───────────────────────────────────────

  // Helper: create a shift and return it
  async function createShift(
    id: string,
    locationId: string,
    startDateStr: string,
    startHour: number,
    durationHours: number,
    skill: Skill,
    status: ShiftStatus = ShiftStatus.PUBLISHED,
    headcount = 1,
  ) {
    const tz = ['loc_downtown', 'loc_mission'].includes(locationId)
      ? 'America/Los_Angeles'
      : 'America/New_York';

    const startUtc = fromZonedTime(
      new Date(`${startDateStr}T${startHour.toString().padStart(2, '0')}:00:00`),
      tz,
    );
    const endUtc = new Date(startUtc.getTime() + durationHours * 3600 * 1000);

    // Premium: Fri/Sat 18:00+ in location tz
    const startInTz = toZonedTime(startUtc, tz);
    const isPremium = [5, 6].includes(startInTz.getDay()) && startInTz.getHours() >= 18;

    return prisma.shift.upsert({
      where: { id },
      update: {},
      create: {
        id,
        locationId,
        startTime: startUtc,
        endTime: endUtc,
        requiredSkill: skill,
        headcount,
        status,
        isPremium,
        createdById: 'user_admin',
      },
    });
  }

  // Downtown SF — this week
  const shifts = await Promise.all([
    // Monday
    createShift('shift_dt_mon_lunch', 'loc_downtown', `${THIS_WEEK_MON}`, 11, 6, Skill.SERVER),
    createShift('shift_dt_mon_bar', 'loc_downtown', `${THIS_WEEK_MON}`, 16, 7, Skill.BARTENDER),
    createShift('shift_dt_mon_host', 'loc_downtown', `${THIS_WEEK_MON}`, 11, 8, Skill.HOST),

    // Tuesday
    createShift('shift_dt_tue_lunch', 'loc_downtown', `2025-05-13`, 11, 6, Skill.SERVER),
    createShift('shift_dt_tue_bar', 'loc_downtown', `2025-05-13`, 16, 7, Skill.BARTENDER),

    // Wednesday
    createShift('shift_dt_wed_dinner', 'loc_downtown', `2025-05-14`, 17, 7, Skill.SERVER),
    createShift('shift_dt_wed_bar', 'loc_downtown', `2025-05-14`, 17, 7, Skill.BARTENDER),
    createShift('shift_dt_wed_kitchen', 'loc_downtown', `2025-05-14`, 12, 8, Skill.COOK),

    // Thursday
    createShift('shift_dt_thu_dinner', 'loc_downtown', `2025-05-15`, 17, 7, Skill.SERVER),
    createShift('shift_dt_thu_bar', 'loc_downtown', `2025-05-15`, 17, 7, Skill.BARTENDER),

    // FRIDAY PREMIUM SHIFTS
    createShift(
      'shift_dt_fri_bar_pm',
      'loc_downtown',
      `2025-05-16`,
      18,
      6,
      Skill.BARTENDER,
      ShiftStatus.PUBLISHED,
    ), // isPremium=true
    createShift(
      'shift_dt_fri_server_pm',
      'loc_downtown',
      `2025-05-16`,
      18,
      6,
      Skill.SERVER,
      ShiftStatus.PUBLISHED,
    ),
    createShift(
      'shift_dt_fri_host_pm',
      'loc_downtown',
      `2025-05-16`,
      18,
      6,
      Skill.HOST,
      ShiftStatus.PUBLISHED,
    ),

    // SATURDAY PREMIUM SHIFTS
    createShift(
      'shift_dt_sat_bar_pm',
      'loc_downtown',
      `2025-05-17`,
      18,
      7,
      Skill.BARTENDER,
      ShiftStatus.PUBLISHED,
    ), // isPremium=true
    createShift(
      'shift_dt_sat_server_pm',
      'loc_downtown',
      `2025-05-17`,
      18,
      7,
      Skill.SERVER,
      ShiftStatus.PUBLISHED,
    ),

    // SUNDAY
    createShift(
      'shift_dt_sun_server_7pm',
      'loc_downtown',
      `2025-05-18`,
      19,
      5,
      Skill.SERVER,
      ShiftStatus.PUBLISHED,
    ), // 7PM shift

    // Mission SF — this week
    createShift('shift_ms_mon_bar', 'loc_mission', `${THIS_WEEK_MON}`, 17, 7, Skill.BARTENDER),
    createShift(
      'shift_ms_fri_bar_pm',
      'loc_mission',
      `2025-05-16`,
      18,
      6,
      Skill.BARTENDER,
      ShiftStatus.PUBLISHED,
    ),
    createShift(
      'shift_ms_sat_bar_pm',
      'loc_mission',
      `2025-05-17`,
      18,
      7,
      Skill.BARTENDER,
      ShiftStatus.PUBLISHED,
    ),

    // NYC — this week
    createShift('shift_nyc_mon_bar', 'loc_nyc', `${THIS_WEEK_MON}`, 17, 7, Skill.BARTENDER),
    createShift(
      'shift_nyc_fri_bar_pm',
      'loc_nyc',
      `2025-05-16`,
      18,
      6,
      Skill.BARTENDER,
      ShiftStatus.PUBLISHED,
    ),
    createShift(
      'shift_nyc_sat_bar_pm',
      'loc_nyc',
      `2025-05-17`,
      18,
      7,
      Skill.BARTENDER,
      ShiftStatus.PUBLISHED,
    ),

    // Boston — this week
    createShift(
      'shift_bos_sat_bar_pm',
      'loc_boston',
      `2025-05-17`,
      18,
      7,
      Skill.BARTENDER,
      ShiftStatus.PUBLISHED,
    ),
  ]);

  console.log(`✅ ${shifts.length} shifts created`);

  // ── Assignments — set up scenarios ────────────────────────────────────────

  // Regular assignments for the week
  const assignments = [
    // Downtown — weekday assignments
    { shiftId: 'shift_dt_mon_lunch', userId: 'user_james' },
    { shiftId: 'shift_dt_mon_bar', userId: 'user_marcus' },
    { shiftId: 'shift_dt_mon_host', userId: 'user_wei' },
    { shiftId: 'shift_dt_tue_lunch', userId: 'user_priya' },
    { shiftId: 'shift_dt_tue_bar', userId: 'user_sarah' },
    { shiftId: 'shift_dt_wed_dinner', userId: 'user_james' },
    { shiftId: 'shift_dt_wed_bar', userId: 'user_marcus' },
    { shiftId: 'shift_dt_wed_kitchen', userId: 'user_aisha' },
    { shiftId: 'shift_dt_thu_dinner', userId: 'user_carlos' }, // carlos is mission-only — will cause CERT violation when reassigning downtown without mission cert
    { shiftId: 'shift_dt_thu_bar', userId: 'user_sarah' },

    // EVALUATION SCENARIO 5 — FAIRNESS: John gets ALL the premium Saturday shifts
    // John has 8 premium shifts, Sarah has 1 — evaluator can see imbalance in analytics
    { shiftId: 'shift_dt_fri_bar_pm', userId: 'user_marcus' },
    { shiftId: 'shift_dt_fri_server_pm', userId: 'user_james' },
    { shiftId: 'shift_dt_fri_host_pm', userId: 'user_wei' },
    { shiftId: 'shift_dt_sat_bar_pm', userId: 'user_marcus' }, // marcus gets sat premium
    { shiftId: 'shift_dt_sat_server_pm', userId: 'user_james' },

    // Mission
    { shiftId: 'shift_ms_mon_bar', userId: 'user_elena' },
    { shiftId: 'shift_ms_fri_bar_pm', userId: 'user_carlos' },
    { shiftId: 'shift_ms_sat_bar_pm', userId: 'user_elena' },

    // NYC
    { shiftId: 'shift_nyc_mon_bar', userId: 'user_maria' },
    { shiftId: 'shift_nyc_fri_bar_pm', userId: 'user_keisha' },
    { shiftId: 'shift_nyc_sat_bar_pm', userId: 'user_keisha' }, // keisha gets NYC premium

    // Boston
    { shiftId: 'shift_bos_sat_bar_pm', userId: 'user_sophie' },
  ];

  for (const a of assignments) {
    await prisma.shiftAssignment.upsert({
      where: { shiftId_userId: { shiftId: a.shiftId, userId: a.userId } },
      update: {},
      create: {
        shiftId: a.shiftId,
        userId: a.userId,
        assignedById: 'user_admin',
        status: AssignmentStatus.ASSIGNED,
      },
    });
  }

  console.log(`✅ ${assignments.length} assignments created`);

  // ── EVALUATION SCENARIO 1 — Sunday Night Chaos ────────────────────────────
  // shift_dt_sun_server_7pm is UNASSIGNED — no one is on it
  // When evaluator logs in as manager, they see a coverage gap on Sunday
  // The "Find Coverage" button should show Sarah (BARTENDER+SERVER, downtown cert) as suggestion
  // Note: Leave this shift UNASSIGNED so evaluator can trigger the coverage workflow

  // ── EVALUATION SCENARIO 2 — Overtime Trap ─────────────────────────────────
  // Alex Stewart (user_alex) has been working Mon–Fri = 5 shifts × 8h = 40h
  // Adding him to Saturday would push to 48h — system should warn
  // Set up: assign alex to Mon/Tue/Wed/Thu/Fri shifts = ~40h

  const overtimeShifts = [
    { id: 'shift_alex_mon', date: THIS_WEEK_MON, startHour: 10, duration: 8 },
    { id: 'shift_alex_tue', date: '2025-05-13', startHour: 10, duration: 8 },
    { id: 'shift_alex_wed', date: '2025-05-14', startHour: 10, duration: 8 },
    { id: 'shift_alex_thu', date: '2025-05-15', startHour: 10, duration: 8 },
    { id: 'shift_alex_fri', date: '2025-05-16', startHour: 10, duration: 8 },
  ];

  for (const s of overtimeShifts) {
    const startUtc = fromZonedTime(
      new Date(`${s.date}T${s.startHour.toString().padStart(2, '0')}:00:00`),
      'America/Los_Angeles',
    );
    const endUtc = new Date(startUtc.getTime() + s.duration * 3600 * 1000);

    await prisma.shift.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        locationId: 'loc_downtown',
        startTime: startUtc,
        endTime: endUtc,
        requiredSkill: Skill.SERVER,
        headcount: 1,
        status: ShiftStatus.PUBLISHED,
        isPremium: false,
        createdById: 'user_admin',
      },
    });

    await prisma.shiftAssignment.upsert({
      where: { shiftId_userId: { shiftId: s.id, userId: 'user_alex' } },
      update: {},
      create: {
        shiftId: s.id,
        userId: 'user_alex',
        assignedById: 'user_admin',
        status: AssignmentStatus.ASSIGNED,
      },
    });
  }

  // Unassigned Saturday shift for Alex — system should warn when manager tries to assign
  const alexSatStart = fromZonedTime(new Date('2025-05-17T10:00:00'), 'America/Los_Angeles');
  await prisma.shift.upsert({
    where: { id: 'shift_alex_sat_open' },
    update: {},
    create: {
      id: 'shift_alex_sat_open',
      locationId: 'loc_downtown',
      startTime: alexSatStart,
      endTime: new Date(alexSatStart.getTime() + 8 * 3600 * 1000),
      requiredSkill: Skill.SERVER,
      headcount: 1,
      status: ShiftStatus.PUBLISHED,
      isPremium: false,
      createdById: 'user_admin',
    },
  });

  console.log(
    '✅ Overtime Trap scenario (Scenario 2) set up — Alex has 40h Mon–Fri, open Saturday shift ready',
  );

  // ── EVALUATION SCENARIO 3 — Timezone Tangle ───────────────────────────────
  // Liam (America/Los_Angeles) is certified at both Downtown SF and NYC
  // He sets availability as 9AM–5PM (his timezone, PST)
  // NYC shifts at 18:00 EST = 15:00 PST — within his window
  // But NYC shifts at 19:00 EST = 16:00 PST — within his window
  // NYC shifts at 22:00 EST = 19:00 PST — OUTSIDE his 9-5 window
  // Seed: create an NYC late-night shift for Liam to demonstrate the tz check

  await prisma.availability.upsert({
    where: { userId_dayOfWeek: { userId: 'user_liam', dayOfWeek: 5 } },
    update: { startTime: '09:00', endTime: '17:00' },
    create: { userId: 'user_liam', dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
  });

  // A late Friday shift at NYC (10pm EST = 7pm PST) — should violate Liam's 9-5 window
  const liamNYCLateStart = fromZonedTime(
    new Date('2025-05-16T22:00:00'), // 10pm NYC time
    'America/New_York',
  );
  await prisma.shift.upsert({
    where: { id: 'shift_nyc_fri_late_bar' },
    update: {},
    create: {
      id: 'shift_nyc_fri_late_bar',
      locationId: 'loc_nyc',
      startTime: liamNYCLateStart,
      endTime: new Date(liamNYCLateStart.getTime() + 4 * 3600 * 1000),
      requiredSkill: Skill.BARTENDER,
      headcount: 1,
      status: ShiftStatus.PUBLISHED,
      isPremium: true,
      createdById: 'user_admin',
    },
  });

  console.log(
    '✅ Timezone Tangle scenario (Scenario 3) set up — Liam unavailable at 10pm NYC time',
  );

  // ── EVALUATION SCENARIO 4 — Simultaneous Assignment ──────────────────────
  // Two separate managers (SF + NYC in different locations) both see Sarah available
  // Seed: create a shift at Downtown where Sarah is the only BARTENDER available
  // Manager SF and a test second manager can both try to assign Sarah simultaneously
  // Note: The pessimistic lock handles this — the second manager sees "Shift was just filled"
  // The seed just needs to leave this shift open
  console.log(
    '✅ Simultaneous Assignment scenario (Scenario 4) — shift_dt_fri_bar_pm is the target',
  );

  // ── EVALUATION SCENARIO 5 — Fairness Complaint ────────────────────────────
  // Add historical premium shifts to show Marcus has 8, Sarah has 1
  // This makes the fairness report immediately visible

  const historicalPremiumShifts = [
    // Past premium shifts — last 4 weeks — all assigned to Marcus
    { date: '2025-04-18', locationId: 'loc_downtown' }, // Fri
    { date: '2025-04-19', locationId: 'loc_downtown' }, // Sat
    { date: '2025-04-25', locationId: 'loc_downtown' }, // Fri
    { date: '2025-04-26', locationId: 'loc_downtown' }, // Sat
    { date: '2025-05-02', locationId: 'loc_downtown' }, // Fri
    { date: '2025-05-03', locationId: 'loc_downtown' }, // Sat
  ];

  for (let i = 0; i < historicalPremiumShifts.length; i++) {
    const { date, locationId } = historicalPremiumShifts[i];
    const startUtc = fromZonedTime(new Date(`${date}T18:00:00`), 'America/Los_Angeles');
    const shiftId = `shift_hist_premium_${i}`;

    await prisma.shift.upsert({
      where: { id: shiftId },
      update: {},
      create: {
        id: shiftId,
        locationId,
        startTime: startUtc,
        endTime: new Date(startUtc.getTime() + 6 * 3600 * 1000),
        requiredSkill: Skill.BARTENDER,
        headcount: 1,
        status: ShiftStatus.PUBLISHED,
        isPremium: true,
        createdById: 'user_admin',
      },
    });

    // All assigned to Marcus — Sarah gets none of the historical premium shifts
    await prisma.shiftAssignment.upsert({
      where: { shiftId_userId: { shiftId, userId: 'user_marcus' } },
      update: {},
      create: {
        shiftId,
        userId: 'user_marcus',
        assignedById: 'user_admin',
        status: AssignmentStatus.ASSIGNED,
      },
    });
  }

  // Sarah gets ONE historical premium shift (to show imbalance vs Marcus's many)
  const sarahOnePremiumStart = fromZonedTime(
    new Date('2025-04-12T18:00:00'),
    'America/Los_Angeles',
  );
  await prisma.shift.upsert({
    where: { id: 'shift_hist_sarah_only_premium' },
    update: {},
    create: {
      id: 'shift_hist_sarah_only_premium',
      locationId: 'loc_downtown',
      startTime: sarahOnePremiumStart,
      endTime: new Date(sarahOnePremiumStart.getTime() + 6 * 3600 * 1000),
      requiredSkill: Skill.BARTENDER,
      headcount: 1,
      status: ShiftStatus.PUBLISHED,
      isPremium: true,
      createdById: 'user_admin',
    },
  });
  await prisma.shiftAssignment.upsert({
    where: { shiftId_userId: { shiftId: 'shift_hist_sarah_only_premium', userId: 'user_sarah' } },
    update: {},
    create: {
      shiftId: 'shift_hist_sarah_only_premium',
      userId: 'user_sarah',
      assignedById: 'user_admin',
      status: AssignmentStatus.ASSIGNED,
    },
  });

  console.log('✅ Fairness scenario (Scenario 5) — Marcus has 8 premium shifts, Sarah has 1');

  // ── EVALUATION SCENARIO 6 — Regret Swap ──────────────────────────────────
  // James has a Wednesday shift, wants to swap with Priya
  // Status: PENDING (James requested, Priya hasn't responded yet)
  // Evaluator can: (a) have Priya accept, then manager sees it in approvals
  //                (b) have James cancel it (the "regret" scenario)
  await prisma.swapRequest.upsert({
    where: { id: 'swapreq_regret_scenario' },
    update: {},
    create: {
      id: 'swapreq_regret_scenario',
      requesterId: 'user_james',
      targetId: 'user_priya',
      shiftId: 'shift_dt_wed_dinner',
      type: 'SWAP',
      status: 'PENDING',
      reason: 'Have a family event on Wednesday evening',
      expiresAt: addDays(new Date('2025-05-14'), 7),
    },
  });

  console.log('✅ Regret Swap scenario (Scenario 6) — James has pending swap request with Priya');

  // ── EDGE CASE: Double Booking demo ───────────────────────────────────────
  // Sarah is assigned to shift_dt_fri_bar_pm (Fri 6pm-midnight downtown)
  // Seed a second overlapping shift (Fri 7pm-midnight, also downtown)
  // Evaluators can try to assign Sarah to this second shift and see DOUBLE_BOOKING error

  const sarahOverlapStart = fromZonedTime(new Date('2025-05-16T19:00:00'), 'America/Los_Angeles');
  await prisma.shift.upsert({
    where: { id: 'shift_dt_fri_overlap_bar' },
    update: {},
    create: {
      id: 'shift_dt_fri_overlap_bar',
      locationId: 'loc_downtown',
      startTime: sarahOverlapStart,
      endTime: new Date(sarahOverlapStart.getTime() + 5 * 3600 * 1000), // 7pm-midnight
      requiredSkill: 'BARTENDER',
      headcount: 1,
      status: 'PUBLISHED',
      isPremium: true,
      notes: 'Demo: try assigning Sarah — double booking constraint fires',
      createdById: 'user_admin',
    },
  });

  // ── EDGE CASE: 10-hour rest violation ─────────────────────────────────────
  // Dmitri works Thu late (ends 1am Fri) then has Fri morning 8am shift
  // Gap = 7h — violates the 10h rest rule

  const dmitriThuLateStart = fromZonedTime(new Date('2025-05-15T18:00:00'), 'America/Los_Angeles');
  const dmitriThuLateEnd = fromZonedTime(new Date('2025-05-16T01:00:00'), 'America/Los_Angeles'); // 1am Fri

  await prisma.shift.upsert({
    where: { id: 'shift_dmitri_thu_late' },
    update: {},
    create: {
      id: 'shift_dmitri_thu_late',
      locationId: 'loc_downtown',
      startTime: dmitriThuLateStart,
      endTime: dmitriThuLateEnd,
      requiredSkill: 'LINE_COOK',
      headcount: 1,
      status: 'PUBLISHED',
      isPremium: false,
      createdById: 'user_admin',
    },
  });
  await prisma.shiftAssignment.upsert({
    where: { shiftId_userId: { shiftId: 'shift_dmitri_thu_late', userId: 'user_dmitri' } },
    update: {},
    create: {
      shiftId: 'shift_dmitri_thu_late',
      userId: 'user_dmitri',
      assignedById: 'user_admin',
      status: 'ASSIGNED',
    },
  });

  const dmitriFriMorningStart = fromZonedTime(
    new Date('2025-05-16T08:00:00'),
    'America/Los_Angeles',
  );
  await prisma.shift.upsert({
    where: { id: 'shift_dmitri_fri_morning' },
    update: {},
    create: {
      id: 'shift_dmitri_fri_morning',
      locationId: 'loc_downtown',
      startTime: dmitriFriMorningStart,
      endTime: new Date(dmitriFriMorningStart.getTime() + 6 * 3600 * 1000),
      requiredSkill: 'LINE_COOK',
      headcount: 1,
      status: 'PUBLISHED',
      isPremium: false,
      notes: 'Demo: try assigning Dmitri — only 7h rest after Thu 1am shift (REST_PERIOD fires)',
      createdById: 'user_admin',
    },
  });
  // Leave shift_dmitri_fri_morning UNASSIGNED so evaluators can try to assign Dmitri
  // The REST_PERIOD constraint will fire: "Dmitri requires 10h rest — only 7h gap"

  // ── EDGE CASE: Overnight shift (11pm–3am) ────────────────────────────────
  // Mission Sat overnight — starts Sat, ends Sun
  const overnightStart = fromZonedTime(new Date('2025-05-17T23:00:00'), 'America/Los_Angeles');
  const overnightEnd = fromZonedTime(new Date('2025-05-18T03:00:00'), 'America/Los_Angeles');
  await prisma.shift.upsert({
    where: { id: 'shift_ms_sat_overnight' },
    update: {},
    create: {
      id: 'shift_ms_sat_overnight',
      locationId: 'loc_mission',
      startTime: overnightStart,
      endTime: overnightEnd,
      requiredSkill: 'BARTENDER',
      headcount: 1,
      status: 'PUBLISHED',
      isPremium: true,
      notes: 'Overnight shift — starts Sat ends Sun 3am',
      createdById: 'user_admin',
    },
  });
  await prisma.shiftAssignment.upsert({
    where: { shiftId_userId: { shiftId: 'shift_ms_sat_overnight', userId: 'user_elena' } },
    update: {},
    create: {
      shiftId: 'shift_ms_sat_overnight',
      userId: 'user_elena',
      assignedById: 'user_admin',
      status: 'ASSIGNED',
    },
  });

  // ── EDGE CASE: 12-hour hard block shift ──────────────────────────────────
  // A 14-hour shift (6am–8pm) at downtown — assign any staff and DAILY_HOURS_HARD fires
  const longShiftStart = fromZonedTime(new Date('2025-05-20T06:00:00'), 'America/Los_Angeles'); // next Tuesday
  await prisma.shift.upsert({
    where: { id: 'shift_dt_long_14h' },
    update: {},
    create: {
      id: 'shift_dt_long_14h',
      locationId: 'loc_downtown',
      startTime: longShiftStart,
      endTime: new Date(longShiftStart.getTime() + 14 * 3600 * 1000), // 8pm
      requiredSkill: 'SERVER',
      headcount: 1,
      status: 'DRAFT',
      isPremium: false,
      notes: 'Demo: 14h duration — DAILY_HOURS_HARD blocks any assignment',
      createdById: 'user_admin',
    },
  });

  // ── EDGE CASE: Accepted swap (state machine demo) ─────────────────────────
  // Sarah requested to swap her Monday bar shift with Elena — Elena accepted
  // Status = MANAGER_REVIEW (waiting on manager Jordan Rivera to approve/reject)
  await prisma.swapRequest.upsert({
    where: { id: 'swapreq_accepted_state' },
    update: {},
    create: {
      id: 'swapreq_accepted_state',
      requesterId: 'user_sarah',
      targetId: 'user_elena',
      shiftId: 'shift_dt_tue_bar',
      type: 'SWAP',
      status: 'MANAGER_REVIEW',
      reason: 'Sarah needs Tuesday off — Elena agreed to swap',
      expiresAt: addDays(new Date('2025-05-13'), 7),
    },
  });

  // ── EDGE CASE: Drop request with expiry ───────────────────────────────────
  // Marcus drops his NYC Monday bartender shift — expires soon
  // NOTE: This shift is actually at downtown (marcus is only certified downtown)
  // Use the mission Monday bar shift for Carlos instead
  await prisma.swapRequest.upsert({
    where: { id: 'swapreq_drop_expiring' },
    update: {},
    create: {
      id: 'swapreq_drop_expiring',
      requesterId: 'user_carlos',
      targetId: null,
      shiftId: 'shift_ms_fri_bar_pm',
      type: 'DROP',
      status: 'PENDING',
      reason: 'Unexpected personal commitment',
      expiresAt: fromZonedTime(new Date('2025-05-16T18:00:00'), 'America/Los_Angeles'), // expires when shift starts
    },
  });

  // ── Dmitri: night-only availability update ───────────────────────────────
  // Dmitri is a night worker — update his availability to 5pm–2am
  await prisma.availability.deleteMany({ where: { userId: 'user_dmitri' } });
  for (let day = 0; day <= 6; day++) {
    await prisma.availability.create({
      data: { userId: 'user_dmitri', dayOfWeek: day, startTime: '17:00', endTime: '02:00' },
    });
  }

  // ── Seeded notifications ──────────────────────────────────────────────────
  const notifData = [
    // Admin notifications
    {
      userId: 'user_admin',
      type: 'OVERTIME_WARNING',
      title: 'Overtime alert',
      message: 'Alex Stewart is projected at 48h this week if Saturday is assigned',
      isRead: false,
      createdAt: new Date('2025-05-09T09:00:00Z'),
    },
    {
      userId: 'user_admin',
      type: 'GENERAL',
      title: 'Schedule published',
      message: 'Jordan Rivera published the Downtown schedule for week of May 12',
      isRead: true,
      createdAt: new Date('2025-05-10T10:05:00Z'),
    },

    // Manager SF notifications
    {
      userId: 'user_mgr_sf',
      type: 'COVERAGE_REQUEST',
      title: 'Drop request submitted',
      message: 'Carlos Mendez dropped their Friday Mission shift — needs coverage',
      isRead: false,
      createdAt: new Date('2025-05-09T14:00:00Z'),
    },
    {
      userId: 'user_mgr_sf',
      type: 'SWAP_REQUEST',
      title: 'Swap pending approval',
      message:
        'Sarah Johnson and Elena Vasquez agreed to swap Tuesday bar shift — awaiting your approval',
      isRead: false,
      createdAt: new Date('2025-05-09T11:00:00Z'),
    },
    {
      userId: 'user_mgr_sf',
      type: 'OVERTIME_WARNING',
      title: 'Overtime risk',
      message: 'Marcus Thompson will hit 40h if assigned to any more shifts this week',
      isRead: true,
      createdAt: new Date('2025-05-08T16:00:00Z'),
    },

    // Sarah notifications
    {
      userId: 'user_sarah',
      type: 'SHIFT_ASSIGNED',
      title: 'New shift assigned',
      message:
        'You have been assigned to a BARTENDER shift at Coastal Eats — Downtown on 2025-05-16',
      isRead: false,
      createdAt: new Date('2025-05-10T10:05:00Z'),
    },
    {
      userId: 'user_sarah',
      type: 'SWAP_REQUEST',
      title: 'Swap in review',
      message: 'Your swap request for the Tuesday bar shift is awaiting manager approval',
      isRead: false,
      createdAt: new Date('2025-05-09T11:05:00Z'),
    },
    {
      userId: 'user_sarah',
      type: 'SCHEDULE_PUBLISHED',
      title: 'Schedule published',
      message: 'The Downtown schedule for week of May 12 has been published',
      isRead: true,
      createdAt: new Date('2025-05-10T10:00:00Z'),
    },

    // Marcus notifications
    {
      userId: 'user_marcus',
      type: 'SHIFT_ASSIGNED',
      title: 'New shift assigned',
      message:
        'You have been assigned to a BARTENDER shift at Coastal Eats — Downtown on 2025-05-17 (Premium)',
      isRead: false,
      createdAt: new Date('2025-05-10T10:05:00Z'),
    },
    {
      userId: 'user_marcus',
      type: 'SCHEDULE_PUBLISHED',
      title: 'Schedule published',
      message: 'The Downtown schedule for week of May 12 has been published',
      isRead: true,
      createdAt: new Date('2025-05-10T10:00:00Z'),
    },

    // James notifications
    {
      userId: 'user_james',
      type: 'SWAP_REQUEST',
      title: 'Swap request sent',
      message: 'You requested to swap your Wednesday shift with Priya Patel',
      isRead: true,
      createdAt: new Date('2025-05-08T09:00:00Z'),
    },
    {
      userId: 'user_james',
      type: 'SHIFT_ASSIGNED',
      title: 'New shift assigned',
      message:
        'You have been assigned to a SERVER shift at Coastal Eats — Downtown on 2025-05-16 (Premium)',
      isRead: false,
      createdAt: new Date('2025-05-10T10:05:00Z'),
    },

    // Elena notifications
    {
      userId: 'user_elena',
      type: 'SWAP_REQUEST',
      title: 'Swap request received',
      message: 'Sarah Johnson wants to swap their Tuesday bar shift with you',
      isRead: false,
      createdAt: new Date('2025-05-09T10:00:00Z'),
    },
  ];

  // Clear existing seeded notifications to prevent duplicates on re-run
  await prisma.notification.deleteMany({
    where: {
      userId: {
        in: ['user_admin', 'user_mgr_sf', 'user_sarah', 'user_marcus', 'user_james', 'user_elena'],
      },
    },
  });

  await prisma.notification.createMany({ data: notifData as any[] });

  console.log(`✅ ${notifData.length} notifications seeded`);

  // ── Audit log entries ─────────────────────────────────────────────────────

  await prisma.auditLog.createMany({
    skipDuplicates: true,
    data: [
      {
        entityType: 'Shift',
        entityId: 'shift_dt_fri_bar_pm',
        action: 'SCHEDULE_PUBLISHED',
        actorId: 'user_mgr_sf',
        actorRole: 'MANAGER',
        actorName: 'Jordan Rivera',
        after: { weekStart: THIS_WEEK_MON, locationId: 'loc_downtown' },
        createdAt: new Date('2025-05-10T10:00:00Z'),
      },
      {
        entityType: 'ShiftAssignment',
        entityId: 'shift_dt_fri_bar_pm',
        action: 'STAFF_ASSIGNED',
        actorId: 'user_mgr_sf',
        actorRole: 'MANAGER',
        actorName: 'Jordan Rivera',
        before: { assignedTo: null },
        after: { userId: 'user_marcus', staffName: 'Marcus Thompson' },
        createdAt: new Date('2025-05-10T10:05:00Z'),
      },
      {
        entityType: 'ShiftAssignment',
        entityId: 'shift_dt_thu_bar',
        action: 'STAFF_REASSIGNED',
        actorId: 'user_mgr_sf',
        actorRole: 'MANAGER',
        actorName: 'Jordan Rivera',
        before: { assignedTo: 'user_james', staffName: 'James Park' },
        after: { assignedTo: 'user_sarah', staffName: 'Sarah Johnson' },
        createdAt: new Date('2025-05-09T14:30:00Z'),
      },
      {
        entityType: 'SwapRequest',
        entityId: 'swapreq_accepted_state',
        action: 'SWAP_ACCEPTED_BY_TARGET',
        actorId: 'user_elena',
        actorRole: 'STAFF',
        actorName: 'Elena Vasquez',
        after: { status: 'MANAGER_REVIEW', message: 'Elena accepted swap with Sarah' },
        createdAt: new Date('2025-05-09T11:00:00Z'),
      },
    ],
  });

  console.log('✅ Audit log entries created');

  // ── LIVE: On-duty shifts (span the full UTC day so they're always active) ───
  // Using start-of-day / end-of-day means on-duty returns data at any time
  // on the seeded day, regardless of when the seed ran.
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const onDutyStart = new Date(todayStr + 'T00:00:00.000Z'); // midnight UTC today
  const onDutyEnd = new Date(todayStr + 'T23:59:59.000Z'); // end of day UTC today

  const liveShifts = [
    {
      id: `shift_live_dt_bar_${todayStr}`,
      locationId: 'loc_downtown',
      userId: 'user_marcus',
      skill: Skill.BARTENDER,
    },
    {
      id: `shift_live_dt_server_${todayStr}`,
      locationId: 'loc_downtown',
      userId: 'user_james',
      skill: Skill.SERVER,
    },
    {
      id: `shift_live_ms_bar_${todayStr}`,
      locationId: 'loc_mission',
      userId: 'user_elena',
      skill: Skill.BARTENDER,
    },
    {
      id: `shift_live_nyc_bar_${todayStr}`,
      locationId: 'loc_nyc',
      userId: 'user_maria',
      skill: Skill.BARTENDER,
    },
  ];

  for (const s of liveShifts) {
    await prisma.shift.upsert({
      where: { id: s.id },
      update: { startTime: onDutyStart, endTime: onDutyEnd },
      create: {
        id: s.id,
        locationId: s.locationId,
        startTime: onDutyStart,
        endTime: onDutyEnd,
        requiredSkill: s.skill,
        headcount: 1,
        status: ShiftStatus.PUBLISHED,
        isPremium: false,
        createdById: 'user_admin',
        notes: 'Live demo shift — seeded for on-duty analytics',
      },
    });

    await prisma.shiftAssignment.upsert({
      where: { shiftId_userId: { shiftId: s.id, userId: s.userId } },
      update: {},
      create: {
        shiftId: s.id,
        userId: s.userId,
        assignedById: 'user_admin',
        status: AssignmentStatus.ASSIGNED,
      },
    });
  }

  console.log(`✅ ${liveShifts.length} live on-duty shifts seeded (active right now)`);

  // ── NEXT WEEK: Full schedule across all 4 locations ───────────────────────
  // May 19 (Mon) – May 25 (Sun) — comprehensive coverage for testing all features

  type SeedShift = {
    id: string;
    locationId: string;
    date: string;
    startHour: number;
    duration: number;
    skill: Skill;
    headcount?: number;
    isPremium?: boolean;
    status?: ShiftStatus;
  };
  type SeedAssignment = { shiftId: string; userId: string };

  const nextWeekShifts: SeedShift[] = [
    // ── Downtown SF — next week ──────────────────────────────────────────────
    // Mon May 19
    {
      id: 'nw_dt_mon_lunch',
      locationId: 'loc_downtown',
      date: '2025-05-19',
      startHour: 11,
      duration: 6,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_dt_mon_bar',
      locationId: 'loc_downtown',
      date: '2025-05-19',
      startHour: 16,
      duration: 7,
      skill: Skill.BARTENDER,
    },
    {
      id: 'nw_dt_mon_host',
      locationId: 'loc_downtown',
      date: '2025-05-19',
      startHour: 11,
      duration: 8,
      skill: Skill.HOST,
    },
    {
      id: 'nw_dt_mon_kitchen',
      locationId: 'loc_downtown',
      date: '2025-05-19',
      startHour: 10,
      duration: 8,
      skill: Skill.COOK,
    },
    // Tue May 20
    {
      id: 'nw_dt_tue_lunch',
      locationId: 'loc_downtown',
      date: '2025-05-20',
      startHour: 11,
      duration: 6,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_dt_tue_bar',
      locationId: 'loc_downtown',
      date: '2025-05-20',
      startHour: 16,
      duration: 7,
      skill: Skill.BARTENDER,
    },
    // Wed May 21
    {
      id: 'nw_dt_wed_dinner',
      locationId: 'loc_downtown',
      date: '2025-05-21',
      startHour: 17,
      duration: 7,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_dt_wed_bar',
      locationId: 'loc_downtown',
      date: '2025-05-21',
      startHour: 17,
      duration: 7,
      skill: Skill.BARTENDER,
    },
    {
      id: 'nw_dt_wed_kitchen',
      locationId: 'loc_downtown',
      date: '2025-05-21',
      startHour: 12,
      duration: 8,
      skill: Skill.COOK,
    },
    // Thu May 22
    {
      id: 'nw_dt_thu_dinner',
      locationId: 'loc_downtown',
      date: '2025-05-22',
      startHour: 17,
      duration: 7,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_dt_thu_bar',
      locationId: 'loc_downtown',
      date: '2025-05-22',
      startHour: 17,
      duration: 7,
      skill: Skill.BARTENDER,
    },
    // Fri May 23 — PREMIUM
    {
      id: 'nw_dt_fri_bar_pm',
      locationId: 'loc_downtown',
      date: '2025-05-23',
      startHour: 18,
      duration: 6,
      skill: Skill.BARTENDER,
      isPremium: true,
    },
    {
      id: 'nw_dt_fri_srv_pm',
      locationId: 'loc_downtown',
      date: '2025-05-23',
      startHour: 18,
      duration: 6,
      skill: Skill.SERVER,
      isPremium: true,
    },
    {
      id: 'nw_dt_fri_host_pm',
      locationId: 'loc_downtown',
      date: '2025-05-23',
      startHour: 18,
      duration: 6,
      skill: Skill.HOST,
      isPremium: true,
    },
    // Sat May 24 — PREMIUM
    {
      id: 'nw_dt_sat_bar_pm',
      locationId: 'loc_downtown',
      date: '2025-05-24',
      startHour: 18,
      duration: 7,
      skill: Skill.BARTENDER,
      isPremium: true,
    },
    {
      id: 'nw_dt_sat_srv_pm',
      locationId: 'loc_downtown',
      date: '2025-05-24',
      startHour: 18,
      duration: 7,
      skill: Skill.SERVER,
      isPremium: true,
    },
    // Sun May 25
    {
      id: 'nw_dt_sun_server',
      locationId: 'loc_downtown',
      date: '2025-05-25',
      startHour: 17,
      duration: 6,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_dt_sun_bar',
      locationId: 'loc_downtown',
      date: '2025-05-25',
      startHour: 17,
      duration: 6,
      skill: Skill.BARTENDER,
    },

    // ── Mission SF — next week ───────────────────────────────────────────────
    {
      id: 'nw_ms_mon_bar',
      locationId: 'loc_mission',
      date: '2025-05-19',
      startHour: 17,
      duration: 7,
      skill: Skill.BARTENDER,
    },
    {
      id: 'nw_ms_wed_kitchen',
      locationId: 'loc_mission',
      date: '2025-05-21',
      startHour: 12,
      duration: 8,
      skill: Skill.COOK,
    },
    {
      id: 'nw_ms_thu_server',
      locationId: 'loc_mission',
      date: '2025-05-22',
      startHour: 17,
      duration: 7,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_ms_fri_bar_pm',
      locationId: 'loc_mission',
      date: '2025-05-23',
      startHour: 18,
      duration: 6,
      skill: Skill.BARTENDER,
      isPremium: true,
    },
    {
      id: 'nw_ms_sat_bar_pm',
      locationId: 'loc_mission',
      date: '2025-05-24',
      startHour: 18,
      duration: 7,
      skill: Skill.BARTENDER,
      isPremium: true,
    },
    // Overnight: Sat 11pm – Sun 3am
    {
      id: 'nw_ms_sat_night',
      locationId: 'loc_mission',
      date: '2025-05-24',
      startHour: 23,
      duration: 4,
      skill: Skill.BARBACK,
      isPremium: true,
    },

    // ── NYC — next week ──────────────────────────────────────────────────────
    {
      id: 'nw_nyc_mon_bar',
      locationId: 'loc_nyc',
      date: '2025-05-19',
      startHour: 17,
      duration: 7,
      skill: Skill.BARTENDER,
    },
    {
      id: 'nw_nyc_wed_host',
      locationId: 'loc_nyc',
      date: '2025-05-21',
      startHour: 11,
      duration: 8,
      skill: Skill.HOST,
    },
    {
      id: 'nw_nyc_fri_bar_pm',
      locationId: 'loc_nyc',
      date: '2025-05-23',
      startHour: 18,
      duration: 6,
      skill: Skill.BARTENDER,
      isPremium: true,
    },
    {
      id: 'nw_nyc_sat_bar_pm',
      locationId: 'loc_nyc',
      date: '2025-05-24',
      startHour: 18,
      duration: 7,
      skill: Skill.BARTENDER,
      isPremium: true,
    },
    {
      id: 'nw_nyc_sat_srv',
      locationId: 'loc_nyc',
      date: '2025-05-24',
      startHour: 18,
      duration: 7,
      skill: Skill.SERVER,
      isPremium: true,
    },
    // Late NYC: 10pm — Liam (PST-based) is UNAVAILABLE here (UNAVAILABLE constraint demo)
    {
      id: 'nw_nyc_fri_late',
      locationId: 'loc_nyc',
      date: '2025-05-23',
      startHour: 22,
      duration: 4,
      skill: Skill.BARTENDER,
      isPremium: true,
    },

    // ── Boston — next week ───────────────────────────────────────────────────
    {
      id: 'nw_bos_wed_server',
      locationId: 'loc_boston',
      date: '2025-05-21',
      startHour: 17,
      duration: 6,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_bos_fri_bar_pm',
      locationId: 'loc_boston',
      date: '2025-05-23',
      startHour: 18,
      duration: 6,
      skill: Skill.BARTENDER,
      isPremium: true,
    },
    {
      id: 'nw_bos_sat_bar_pm',
      locationId: 'loc_boston',
      date: '2025-05-24',
      startHour: 18,
      duration: 7,
      skill: Skill.BARTENDER,
      isPremium: true,
    },

    // ── Constraint demo: CONSECUTIVE DAYS — Consecutive 6th/7th day ──────────
    // Priya works Mon–Fri (5 days) — adding Sat = 6th day warning, adding Sun = 7th day block
    {
      id: 'nw_consec_priya_mon',
      locationId: 'loc_downtown',
      date: '2025-05-19',
      startHour: 10,
      duration: 6,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_consec_priya_tue',
      locationId: 'loc_downtown',
      date: '2025-05-20',
      startHour: 10,
      duration: 6,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_consec_priya_wed',
      locationId: 'loc_downtown',
      date: '2025-05-21',
      startHour: 10,
      duration: 6,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_consec_priya_thu',
      locationId: 'loc_downtown',
      date: '2025-05-22',
      startHour: 10,
      duration: 6,
      skill: Skill.SERVER,
    },
    {
      id: 'nw_consec_priya_fri',
      locationId: 'loc_downtown',
      date: '2025-05-23',
      startHour: 10,
      duration: 6,
      skill: Skill.SERVER,
    },
    // Saturday shift — assigning Priya = CONSECUTIVE_6TH warning
    {
      id: 'nw_consec_sat_open',
      locationId: 'loc_downtown',
      date: '2025-05-24',
      startHour: 10,
      duration: 6,
      skill: Skill.SERVER,
    },
    // Sunday shift — assigning Priya = CONSECUTIVE_7TH hard block (requires override)
    {
      id: 'nw_consec_sun_open',
      locationId: 'loc_downtown',
      date: '2025-05-25',
      startHour: 10,
      duration: 6,
      skill: Skill.SERVER,
    },

    // ── Constraint demo: AVAILABILITY WINDOW — Wei only works weekdays ────────
    // Wei has no Friday/Saturday availability — trying to assign Sat = UNAVAILABLE
    {
      id: 'nw_dt_sat_host_open',
      locationId: 'loc_downtown',
      date: '2025-05-24',
      startHour: 18,
      duration: 6,
      skill: Skill.HOST,
      isPremium: true,
    },

    // ── Constraint demo: DAILY HOURS > 12h hard block ────────────────────────
    {
      id: 'nw_dt_tue_14h',
      locationId: 'loc_downtown',
      date: '2025-05-20',
      startHour: 8,
      duration: 14,
      skill: Skill.SERVER,
      status: ShiftStatus.DRAFT,
    },
  ];

  const nextWeekAssignments: SeedAssignment[] = [
    // Downtown Mon–Thu coverage
    { shiftId: 'nw_dt_mon_lunch', userId: 'user_james' },
    { shiftId: 'nw_dt_mon_bar', userId: 'user_marcus' },
    { shiftId: 'nw_dt_mon_host', userId: 'user_wei' },
    { shiftId: 'nw_dt_mon_kitchen', userId: 'user_aisha' },
    { shiftId: 'nw_dt_tue_lunch', userId: 'user_priya' },
    { shiftId: 'nw_dt_wed_dinner', userId: 'user_james' },
    { shiftId: 'nw_dt_wed_bar', userId: 'user_marcus' },
    { shiftId: 'nw_dt_wed_kitchen', userId: 'user_aisha' },
    { shiftId: 'nw_dt_thu_dinner', userId: 'user_james' },
    { shiftId: 'nw_dt_thu_bar', userId: 'user_sarah' },
    // Downtown Fri/Sat premium — Marcus gets BOTH again for fairness demo
    { shiftId: 'nw_dt_fri_bar_pm', userId: 'user_marcus' },
    { shiftId: 'nw_dt_sat_bar_pm', userId: 'user_marcus' },
    // Downtown Sun
    { shiftId: 'nw_dt_sun_server', userId: 'user_alex' },
    // Mission
    { shiftId: 'nw_ms_mon_bar', userId: 'user_elena' },
    { shiftId: 'nw_ms_fri_bar_pm', userId: 'user_carlos' },
    { shiftId: 'nw_ms_sat_bar_pm', userId: 'user_elena' },
    { shiftId: 'nw_ms_sat_night', userId: 'user_rashid' },
    // NYC
    { shiftId: 'nw_nyc_mon_bar', userId: 'user_maria' },
    { shiftId: 'nw_nyc_fri_bar_pm', userId: 'user_keisha' },
    { shiftId: 'nw_nyc_sat_bar_pm', userId: 'user_keisha' },
    // Boston
    { shiftId: 'nw_bos_fri_bar_pm', userId: 'user_sophie' },
    { shiftId: 'nw_bos_sat_bar_pm', userId: 'user_tamika' },
    // Consecutive days for Priya (Mon–Fri assigned = 5 consecutive days)
    { shiftId: 'nw_consec_priya_mon', userId: 'user_priya' },
    { shiftId: 'nw_consec_priya_tue', userId: 'user_priya' },
    { shiftId: 'nw_consec_priya_wed', userId: 'user_priya' },
    { shiftId: 'nw_consec_priya_thu', userId: 'user_priya' },
    { shiftId: 'nw_consec_priya_fri', userId: 'user_priya' },
    // nw_consec_sat_open & nw_consec_sun_open left UNASSIGNED — try assigning Priya
    // nw_nyc_fri_late left UNASSIGNED — try assigning Liam → UNAVAILABLE (PST outside 9-5)
    // nw_dt_sat_host_open left UNASSIGNED — try assigning Wei → UNAVAILABLE (no Friday avail)
    // nw_dt_fri_srv_pm, nw_dt_fri_host_pm, nw_dt_sat_srv_pm left partially unassigned
  ];

  for (const s of nextWeekShifts) {
    const tz = ['loc_downtown', 'loc_mission'].includes(s.locationId)
      ? 'America/Los_Angeles'
      : 'America/New_York';
    const startUtc = fromZonedTime(
      new Date(`${s.date}T${s.startHour.toString().padStart(2, '0')}:00:00`),
      tz,
    );
    const endUtc = new Date(startUtc.getTime() + s.duration * 3600 * 1000);
    const startZoned = toZonedTime(startUtc, tz);
    const isPremium =
      s.isPremium ?? ([5, 6].includes(startZoned.getDay()) && startZoned.getHours() >= 18);

    await prisma.shift.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        locationId: s.locationId,
        startTime: startUtc,
        endTime: endUtc,
        requiredSkill: s.skill,
        headcount: s.headcount ?? 1,
        status: s.status ?? ShiftStatus.PUBLISHED,
        isPremium,
        createdById: 'user_admin',
      },
    });
  }

  for (const a of nextWeekAssignments) {
    await prisma.shiftAssignment.upsert({
      where: { shiftId_userId: { shiftId: a.shiftId, userId: a.userId } },
      update: {},
      create: {
        shiftId: a.shiftId,
        userId: a.userId,
        assignedById: 'user_admin',
        status: AssignmentStatus.ASSIGNED,
      },
    });
  }

  console.log(
    `✅ Next week (May 19-25): ${nextWeekShifts.length} shifts seeded across all 4 locations`,
  );

  // ── Open shifts relative to TODAY so the UI schedule always has something to assign ──
  // These use dynamic dates so they appear in the current & upcoming week in the UI.
  {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().getDay(); // 0=Sun
    const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonDate = addDays(new Date(todayStr), daysToMon);
    const nextMonDate = addDays(thisMonDate, 7);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const NW_MON = fmt(nextMonDate);
    const NW_TUE = fmt(addDays(nextMonDate, 1));
    const NW_WED = fmt(addDays(nextMonDate, 2));
    const NW_THU = fmt(addDays(nextMonDate, 3));
    const NW_FRI = fmt(addDays(nextMonDate, 4));
    const NW_SAT = fmt(addDays(nextMonDate, 5));

    const openShifts = [
      // ── 4 clean assignable shifts — happy path UI testing ──────────────────
      {
        id: 'open_dt_mon_server',
        locationId: 'loc_downtown',
        date: NW_MON,
        startHour: 11,
        duration: 6,
        skill: Skill.SERVER,
      },
      {
        id: 'open_dt_wed_bar',
        locationId: 'loc_downtown',
        date: NW_WED,
        startHour: 16,
        duration: 7,
        skill: Skill.BARTENDER,
      },
      {
        id: 'open_ms_thu_bar',
        locationId: 'loc_mission',
        date: NW_THU,
        startHour: 17,
        duration: 6,
        skill: Skill.BARTENDER,
      },
      {
        id: 'open_nyc_fri_bar',
        locationId: 'loc_nyc',
        date: NW_FRI,
        startHour: 18,
        duration: 6,
        skill: Skill.BARTENDER,
      },
      // ── Suggestion scenario: partially filled, 2 open slots ────────────────
      // Assign one then try assigning a wrong-skill person → suggestions appear
      {
        id: 'open_dt_fri_srv',
        locationId: 'loc_downtown',
        date: NW_FRI,
        startHour: 18,
        duration: 6,
        skill: Skill.SERVER,
        headcount: 2,
      },
      {
        id: 'open_dt_sat_bar',
        locationId: 'loc_downtown',
        date: NW_SAT,
        startHour: 18,
        duration: 7,
        skill: Skill.BARTENDER,
        headcount: 2,
      },
      {
        id: 'open_ms_mon_bar',
        locationId: 'loc_mission',
        date: NW_MON,
        startHour: 17,
        duration: 7,
        skill: Skill.BARTENDER,
      },
      {
        id: 'open_nyc_mon_bar',
        locationId: 'loc_nyc',
        date: NW_MON,
        startHour: 17,
        duration: 7,
        skill: Skill.BARTENDER,
      },
      {
        id: 'open_dt_tue_host',
        locationId: 'loc_downtown',
        date: NW_TUE,
        startHour: 11,
        duration: 8,
        skill: Skill.HOST,
      },
    ];

    for (const s of openShifts) {
      const tz = ['loc_downtown', 'loc_mission'].includes(s.locationId)
        ? 'America/Los_Angeles'
        : 'America/New_York';
      const startUtc = fromZonedTime(
        new Date(`${s.date}T${s.startHour.toString().padStart(2, '0')}:00:00`),
        tz,
      );
      const endUtc = new Date(startUtc.getTime() + s.duration * 3600 * 1000);

      await prisma.shift.upsert({
        where: { id: s.id },
        update: { startTime: startUtc, endTime: endUtc }, // keep dates fresh on re-seed
        create: {
          id: s.id,
          locationId: s.locationId,
          startTime: startUtc,
          endTime: endUtc,
          requiredSkill: s.skill,
          headcount: (s as any).headcount ?? 1,
          status: ShiftStatus.PUBLISHED,
          isPremium: [5, 6].includes(new Date(s.date).getDay()) && s.startHour >= 18,
          createdById: 'user_admin',
        },
      });
    }

    console.log(
      `✅ Open shifts for next week (${NW_MON} to ${NW_SAT}): ${openShifts.length} slots ready to assign`,
    );
  }

  console.log(`
╔════════════════════════════════════════════════════════════╗
║          ShiftSync Seed Complete                           ║
╠════════════════════════════════════════════════════════════╣
║  Login credentials (password: Password123!)                ║
║  Admin:       admin@coastal-eats.com                       ║
║  Manager SF:  manager.sf@coastal-eats.com                  ║
║  Manager NYC: manager.nyc@coastal-eats.com                 ║
║  Staff:       sarah@coastal-eats.com  (bartender, SF)      ║
║               marcus@coastal-eats.com (bartender, SF)      ║
║               james@coastal-eats.com  (server, SF)         ║
║               maria@coastal-eats.com  (bartender, NYC)     ║
║               liam@coastal-eats.com   (cross-tz, SF+NYC)   ║
║               dmitri@coastal-eats.com (line cook, 5pm-2am) ║
╠════════════════════════════════════════════════════════════╣
║  Seeded shifts cover Sun-Sun across all 4 locations        ║
║  Mix of open, assigned, and swap-pending shifts included   ║
║  Premium flag applied to Fri/Sat evening shifts            ║
╚════════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
