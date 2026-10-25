export interface ComponentSpec {
  id: string;
  name: string;
  category: 'compute' | 'power' | 'drive' | 'sensing' | 'fabrication';
  manufacturer: string;
  model: string;
  dimensions: { length: number; width: number; height: number; unit: 'mm' };
  massGrams: number;
  voltageNominal: string;
  powerNominal: string;
  interfaces: string[];
  status: 'Target' | 'Simulated' | 'Verified' | 'Procured';
  notes: string;
}

export interface WorkspaceNode {
  id: string;
  title: string;
  subtitle: string;
  category: 'compute' | 'power' | 'drive' | 'sensing' | 'fabrication';
  side: 'left' | 'right';
  xOffset: number;
  yOffset: number;
  badge: string;
  components: ComponentSpec[];
}

export const WORKSPACE_NODES: WorkspaceNode[] = [
  {
    id: 'compute-control',
    title: 'Compute & Logic',
    subtitle: 'Dual Architecture (ROS 2 + RTOS)',
    category: 'compute',
    side: 'left',
    xOffset: -280,
    yOffset: -120,
    badge: 'Pi 5 + RP2350',
    components: [
      {
        id: 'pi5',
        name: 'Raspberry Pi 5',
        category: 'compute',
        manufacturer: 'Raspberry Pi',
        model: '8 GB SC1112',
        dimensions: { length: 85, width: 56, height: 17, unit: 'mm' },
        massGrams: 46,
        voltageNominal: '5.1 V',
        powerNominal: '12 W peak',
        interfaces: ['USB 3.0', 'PCIe 2.0', 'UART', 'Gigabit Ethernet'],
        status: 'Target',
        notes: 'High-level mapping, scan-matching and 3D reconstruction twin server.',
      },
      {
        id: 'pico2',
        name: 'Raspberry Pi Pico 2',
        category: 'compute',
        manufacturer: 'Raspberry Pi',
        model: 'RP2350 Arm Cortex-M33',
        dimensions: { length: 51, width: 21, height: 4, unit: 'mm' },
        massGrams: 3,
        voltageNominal: '3.3 V logic / 5V VBUS',
        powerNominal: '0.15 W',
        interfaces: ['Dual UART', '8x PIO', 'PWM', 'Hardware Watchdog'],
        status: 'Verified',
        notes: 'Deterministic wheel PWM generation, encoder polling, and 200 ms safety halt.',
      },
    ],
  },
  {
    id: 'spatial-sensing',
    title: 'Spatial Sensing',
    subtitle: 'Tilting 2D LiDAR + 9-DOF IMU',
    category: 'sensing',
    side: 'left',
    xOffset: -280,
    yOffset: 120,
    badge: 'S2 30m · 0.5° Yaw Drift',
    components: [
      {
        id: 'rplidar-s2',
        name: 'RPLIDAR S2',
        category: 'sensing',
        manufacturer: 'Slamtec',
        model: 'S2 30m Range 2D LiDAR',
        dimensions: { length: 77, width: 77, height: 41, unit: 'mm' },
        massGrams: 190,
        voltageNominal: '5 V',
        powerNominal: '2.5 W',
        interfaces: ['UART (1M baud) / USB Bridge', 'OPM Optical'],
        status: 'Procured',
        notes: 'Produces 32k points/sec slice; step-and-settle mechanism prevents tilt distortion.',
      },
      {
        id: 'bno085',
        name: 'BNO085 IMU',
        category: 'sensing',
        manufacturer: 'CEVA / Hillcrest',
        model: '9-DOF Robotic Orientation Breakout',
        dimensions: { length: 26, width: 22, height: 3, unit: 'mm' },
        massGrams: 3,
        voltageNominal: '3.3 V',
        powerNominal: '0.05 W',
        interfaces: ['I2C / SPI / UART-RVC', 'Tare GPIO'],
        status: 'Verified',
        notes: 'Provides tilt pitch angle ground truth and short-term attitude correction.',
      },
    ],
  },
  {
    id: 'power-protection',
    title: 'Power & Protection',
    subtitle: '12V LiFePO4 + Dual Regulators',
    category: 'power',
    side: 'right',
    xOffset: 280,
    yOffset: -120,
    badge: '12Ah · 2h Mission Target',
    components: [
      {
        id: 'bioenno-battery',
        name: 'Bioenno LiFePO4',
        category: 'power',
        manufacturer: 'Bioenno Power',
        model: 'BLF-1212AS 12V 12Ah',
        dimensions: { length: 151, width: 65, height: 95, unit: 'mm' },
        massGrams: 1500,
        voltageNominal: '12.8 V (10.0V cutoff)',
        powerNominal: '153.6 Wh capacity',
        interfaces: ['Anderson Powerpole SB50', 'PCM Internal BMS'],
        status: 'Verified',
        notes: 'Tested runtime: 2.4h under typical 60W roving load.',
      },
      {
        id: 'safety-estop',
        name: 'Emergency Disconnect',
        category: 'power',
        manufacturer: 'Industrial',
        model: 'Push-Lock Twist-Release + 30A Shunt',
        dimensions: { length: 68, width: 42, height: 42, unit: 'mm' },
        massGrams: 110,
        voltageNominal: '24V / 30A Max',
        powerNominal: 'Passive safety isolation',
        interfaces: ['NC Auxiliary', 'INA228 High-Side Kelvin'],
        status: 'Target',
        notes: 'Instantly de-energizes motor drive bus while retaining Pi 5 logging power.',
      },
    ],
  },
  {
    id: 'drive-kinematics',
    title: 'Drive & Actuation',
    subtitle: '4-Mecanum Holonomic Drive',
    category: 'drive',
    side: 'right',
    xOffset: 280,
    yOffset: 120,
    badge: '4x 70:1 Motors · 0.45 m/s',
    components: [
      {
        id: 'pololu-4694',
        name: 'Pololu 37D Gearmotor (x4)',
        category: 'drive',
        manufacturer: 'Pololu',
        model: '#4694 70:1 Metal Gearbox with 64-CPR Encoder',
        dimensions: { length: 73, width: 37, height: 37, unit: 'mm' },
        massGrams: 225,
        voltageNominal: '12 V nominal',
        powerNominal: '6.5 W per motor (nominal)',
        interfaces: ['Motor +/- Leads', 'Hall Quad A/B', 'VCC/GND'],
        status: 'Target',
        notes: 'Provides 20 kg-cm stall torque per corner for omnidirectional maneuvering.',
      },
      {
        id: 'cytron-mdd10a',
        name: 'Cytron MDD10A (x2)',
        category: 'drive',
        manufacturer: 'Cytron Technologies',
        model: '10A Continuous Dual Motor Driver',
        dimensions: { length: 85, width: 55, height: 18, unit: 'mm' },
        massGrams: 42,
        voltageNominal: '5V - 30V input',
        powerNominal: '10A continuous per channel',
        interfaces: ['DIR / PWM logic', 'Screw Terminals'],
        status: 'Procured',
        notes: 'Driven directly from Pico 2 PWM channels at 20 kHz ultrasonic frequency.',
      },
    ],
  },
];
