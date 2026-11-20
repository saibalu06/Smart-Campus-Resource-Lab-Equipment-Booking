import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';

function formatLocalDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function seedDatabase(db: Database.Database): void {
  const userCountRow = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  const resourceCountRow = db.prepare('SELECT COUNT(*) AS count FROM resources').get() as { count: number };

  if (userCountRow.count > 0 || resourceCountRow.count > 0) {
    return;
  }

  const seedTransaction = db.transaction(() => {
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, department)
      VALUES (@name, @email, @password_hash, @role, @department)
    `);

    const adminHash = bcrypt.hashSync('AdminPass123!', 10);
    const studentHash = bcrypt.hashSync('Student123!', 10);

    const adminRes = insertUser.run({
      name: 'Dr. Elena Vance',
      email: 'admin@campus.edu',
      password_hash: adminHash,
      role: 'Lab Admin',
      department: 'Electrical & Computer Engineering',
    });

    const mayaRes = insertUser.run({
      name: 'Maya Lin',
      email: 'maya.lin@campus.edu',
      password_hash: studentHash,
      role: 'Student',
      department: 'Robotics & Embedded Systems',
    });

    const marcusRes = insertUser.run({
      name: 'Marcus Reid',
      email: 'marcus.reid@campus.edu',
      password_hash: studentHash,
      role: 'Student',
      department: 'Computer Science',
    });

    const insertResource = db.prepare(`
      INSERT INTO resources (name, asset_code, category, status, specs, location, max_duration_hours, image_url)
      VALUES (@name, @asset_code, @category, @status, @specs, @location, @max_duration_hours, @image_url)
    `);

    const seedResources = [
      {
        name: 'Keysight DSOX1204G Oscilloscope',
        asset_code: 'EL-OSC-01',
        category: 'Electronics Lab',
        status: 'Available',
        specs: '4-Channel, 200 MHz bandwidth, 2 GSa/s sampling, integrated 20 MHz function generator',
        location: 'Room EE-204, Bench 3',
        max_duration_hours: 4,
        image_url: '/src/assets/images/electronics_oscilloscope_1795156019457.jpg',
      },
      {
        name: 'Rigol DP832 Programmable DC Supply',
        asset_code: 'EL-PSU-04',
        category: 'Electronics Lab',
        status: 'Available',
        specs: 'Triple-output 195W linear benchtop supply (30V/3A x2, 5V/3A), USB & LAN telemetry',
        location: 'Room EE-204, Bench 7',
        max_duration_hours: 6,
        image_url: '/src/assets/images/electronics_oscilloscope_1795156019457.jpg',
      },
      {
        name: 'Rohde & Schwarz FPC1000 Analyzer',
        asset_code: 'EL-RF-02',
        category: 'Electronics Lab',
        status: 'Maintenance',
        specs: '5 kHz to 1 GHz RF spectrum analyzer with tracking generator; annual calibration',
        location: 'Room EE-210, RF Bay',
        max_duration_hours: 3,
        image_url: '/src/assets/images/electronics_oscilloscope_1795156019457.jpg',
      },
      {
        name: 'Raspberry Pi 5 Embedded Vision Kit',
        asset_code: 'CL-RPI-12',
        category: 'Computing Lab',
        status: 'Available',
        specs: '8GB LPDDR4X, active aluminum heatsink, Camera Module 3, GPIO breadboard & sensor pack',
        location: 'Room CS-108, Pod B',
        max_duration_hours: 8,
        image_url: '/src/assets/images/computing_cluster_1795156020726.jpg',
      },
      {
        name: 'Xilinx Artix-7 FPGA Prototyping Bench',
        asset_code: 'CL-FPGA-05',
        category: 'Computing Lab',
        status: 'In Use',
        specs: 'Nexys A7-100T FPGA board, JTAG programmer, 16-channel USB logic analyzer probes',
        location: 'Room CS-112, Hardware Lab',
        max_duration_hours: 4,
        image_url: '/src/assets/images/computing_cluster_1795156020726.jpg',
      },
      {
        name: 'NVIDIA Jetson Orin Nano Edge Rig',
        asset_code: 'CL-EDGE-03',
        category: 'Computing Lab',
        status: 'Available',
        specs: '40 TOPS AI compute, 8GB memory, 512GB NVMe SSD, dual MIPI CSI camera interfaces',
        location: 'Room CS-108, Pod D',
        max_duration_hours: 6,
        image_url: '/src/assets/images/computing_cluster_1795156020726.jpg',
      },
      {
        name: 'Turing Auditorium & 4K Laser Projector',
        asset_code: 'SR-AUD-01',
        category: 'Seminar Rooms',
        status: 'Available',
        specs: '48-seat tiered seminar hall, 6,000-lumen 4K laser projector, dual wireless mics',
        location: 'Engineering Hall 301',
        max_duration_hours: 3,
        image_url: '/src/assets/images/seminar_hall_1795156020860.jpg',
      },
      {
        name: 'Maxwell Studio & Interactive Projector',
        asset_code: 'SR-STD-02',
        category: 'Seminar Rooms',
        status: 'Available',
        specs: '18-person studio, full-wall glass whiteboards, short-throw Epson laser projector',
        location: 'Innovation Wing 104',
        max_duration_hours: 4,
        image_url: '/src/assets/images/seminar_hall_1795156020860.jpg',
      },
    ];

    const resourceIds: number[] = [];
    for (const resource of seedResources) {
      const info = insertResource.run(resource);
      resourceIds.push(Number(info.lastInsertRowid));
    }

    const today = formatLocalDate(0);
    const tomorrow = formatLocalDate(1);
    const yesterday = formatLocalDate(-1);

    const insertBooking = db.prepare(`
      INSERT INTO bookings (resource_id, user_id, booking_date, start_time, end_time, purpose, status, rejection_reason)
      VALUES (@resource_id, @user_id, @booking_date, @start_time, @end_time, @purpose, @status, @rejection_reason)
    `);

    const mayaId = Number(mayaRes.lastInsertRowid);
    const marcusId = Number(marcusRes.lastInsertRowid);
    const adminId = Number(adminRes.lastInsertRowid);

    // Approved bookings today
    insertBooking.run({
      resource_id: resourceIds[4], // Xilinx Artix-7 FPGA
      user_id: mayaId,
      booking_date: today,
      start_time: '09:00',
      end_time: '11:00',
      purpose: 'ECE-412 Pipelined RISC-V Verilog synthesis and timing verification',
      status: 'Approved',
      rejection_reason: null,
    });

    insertBooking.run({
      resource_id: resourceIds[6], // Turing Auditorium
      user_id: marcusId,
      booking_date: today,
      start_time: '13:00',
      end_time: '15:00',
      purpose: 'Autonomous Robotics Capstone mid-semester architecture review',
      status: 'Approved',
      rejection_reason: null,
    });

    // Pending approvals waiting for Lab Admin
    insertBooking.run({
      resource_id: resourceIds[0], // Keysight Oscilloscope
      user_id: mayaId,
      booking_date: today,
      start_time: '15:00',
      end_time: '17:00',
      purpose: 'BLDC motor driver PWM ripple and gate-drive switching characterization',
      status: 'Pending',
      rejection_reason: null,
    });

    insertBooking.run({
      resource_id: resourceIds[3], // Raspberry Pi 5 Kit
      user_id: marcusId,
      booking_date: tomorrow,
      start_time: '10:00',
      end_time: '14:00',
      purpose: 'Real-time AprilTag fiducial pose estimation benchmark on Edge Linux',
      status: 'Pending',
      rejection_reason: null,
    });

    // Historical booking (for realistic analytics & CSV export)
    insertBooking.run({
      resource_id: resourceIds[2], // R&S Spectrum Analyzer
      user_id: marcusId,
      booking_date: yesterday,
      start_time: '11:00',
      end_time: '13:00',
      purpose: '2.4 GHz telemetry transceiver harmonic emission pre-compliance check',
      status: 'Rejected',
      rejection_reason: 'Unit is undergoing scheduled annual RF calibration in EE-210.',
    });

    // Admin maintenance test reservation tomorrow
    insertBooking.run({
      resource_id: resourceIds[7], // Maxwell Studio
      user_id: adminId,
      booking_date: tomorrow,
      start_time: '09:00',
      end_time: '10:30',
      purpose: 'Faculty safety orientation and lab access briefing',
      status: 'Approved',
      rejection_reason: null,
    });
  });

  seedTransaction();
}
