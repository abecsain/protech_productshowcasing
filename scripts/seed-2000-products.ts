import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error('TURSO_DATABASE_URL is not set in environment.');
}

const client = createClient({ url, authToken });

interface CategoryTemplate {
  name: string;
  photoIds: string[];
  brands: string[];
  models: { name: string; basePrice: number; descTemplate: string }[];
  modifiers: { suffix: string; priceMultiplier: number; spec: string }[];
}

const CATEGORIES: CategoryTemplate[] = [
  {
    name: 'Laptops & Computers',
    photoIds: [
      'photo-1517336714731-489689fd1ca8',
      'photo-1603302576837-37561b2e2302',
      'photo-1588872657578-7efd1f1555ed',
      'photo-1496181133206-80ce9b88a853',
      'photo-1541807084-5c52b6b3adef',
    ],
    brands: ['Dell', 'Lenovo', 'HP', 'ASUS', 'Apple', 'Acer', 'MSI'],
    models: [
      { name: 'Latitude 7440 Ultrabook', basePrice: 84999, descTemplate: 'Intel Core i7 13th Gen, 16GB LPDDR5 RAM, 512GB NVMe SSD, 14-inch FHD+ anti-glare display with 3-year ProSupport warranty.' },
      { name: 'ThinkPad T14 Gen 4 Business Laptop', basePrice: 92999, descTemplate: 'AMD Ryzen 7 PRO processor, 32GB RAM, 1TB PCIe Gen4 SSD, MIL-SPEC tested durability, backlit spill-resistant keyboard.' },
      { name: 'MacBook Air M3 Liquid Retina', basePrice: 114900, descTemplate: 'Apple M3 chip with 8-core CPU and 10-core GPU, 13.6-inch Liquid Retina display, MagSafe charging, up to 18-hour battery life.' },
      { name: 'EliteBook 840 G10 Enterprise Laptop', basePrice: 89999, descTemplate: 'Intel Core i5 vPro platform, HP Wolf Security, 16GB DDR5, 512GB SSD, Wi-Fi 6E and 5MP IR privacy camera.' },
      { name: 'ZenBook 14 OLED Slim Laptop', basePrice: 79999, descTemplate: '14-inch 2.8K 90Hz OLED display, Intel Core Ultra 7 processor, 16GB RAM, 1TB SSD, Harman Kardon certified audio.' },
      { name: 'Legion Pro 5i High-Performance PC', basePrice: 129999, descTemplate: 'Intel Core i9-14900HX, NVIDIA GeForce RTX 4070 8GB, 32GB DDR5, 1TB Gen4 SSD, 240Hz WQXGA gaming & workstation display.' },
      { name: 'ProDesk 400 Micro Desktop Tower', basePrice: 46999, descTemplate: 'Compact enterprise business desktop with Intel Core i5, 16GB RAM, 512GB SSD, dual DisplayPort and tool-less chassis.' },
      { name: 'OptiPlex 7010 Small Form Factor', basePrice: 52999, descTemplate: 'Space-saving commercial desktop featuring Intel Core i7, 16GB DDR5, 512GB SSD, TPM 2.0 and enterprise lifecycle support.' },
    ],
    modifiers: [
      { suffix: 'Standard Edition', priceMultiplier: 1.0, spec: 'Includes 1-year standard warranty.' },
      { suffix: 'Pro Business Pack', priceMultiplier: 1.15, spec: 'Includes Windows 11 Pro and 3-year onsite support.' },
      { suffix: 'Performance Plus 32GB', priceMultiplier: 1.25, spec: 'Upgraded to 32GB high-speed memory and 1TB storage.' },
      { suffix: 'Executive Edition 2TB', priceMultiplier: 1.4, spec: 'Max configuration with 2TB Gen4 SSD and dock bundle.' },
    ],
  },
  {
    name: 'Monitors & Displays',
    photoIds: [
      'photo-1527443224154-c4a3942d3acf',
      'photo-1593642632823-8f785ba67e45',
      'photo-1547082299-de196ea013d6',
      'photo-1551645120-d70bfe84c826',
    ],
    brands: ['Dell', 'LG', 'Samsung', 'BenQ', 'ASUS', 'ViewSonic'],
    models: [
      { name: 'UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)', basePrice: 54999, descTemplate: 'IPS Black technology with 2000:1 contrast, 98% DCI-P3, 90W power delivery, RJ45 Ethernet, and height adjustable stand.' },
      { name: 'UltraFine 32" Ergo 4K Display (32UN880)', basePrice: 48999, descTemplate: '3840x2160 UHD IPS panel with innovative ergonomic C-clamp arm, HDR10, USB-C one-cable solution, and built-in speakers.' },
      { name: 'ViewFinity S9 27" 5K Studio Monitor', basePrice: 99999, descTemplate: '5120x2880 resolution with matte finish, Thunderbolt 4 connectivity, 99% DCI-P3, smart calibration, and 4K SlimFit camera.' },
      { name: 'ProArt 27" Color-Accurate Display (PA278CV)', basePrice: 28999, descTemplate: 'Factory calibrated Delta E < 2 color accuracy, 100% sRGB/Rec. 709, daisy-chaining DisplayPort, and extensive connectivity.' },
      { name: 'DesignVue 32" 4K Thunderbolt Designer Monitor', basePrice: 72999, descTemplate: 'Dual color space view, KVM switch, Hotkey Puck G2 controller, ICCsync color consistency for CAD and creative workflows.' },
      { name: 'Business 24" FHD IPS Height-Adjustable Monitor', basePrice: 12499, descTemplate: 'Flicker-free eye comfort technology, 3-sided ultrathin bezel, HDMI/VGA/DisplayPort inputs, and VESA mount capability.' },
    ],
    modifiers: [
      { suffix: 'Desk Stand Model', priceMultiplier: 1.0, spec: 'Factory tilt/swivel base.' },
      { suffix: 'Dual Arm Ergonomic Bundle', priceMultiplier: 1.18, spec: 'Includes premium heavy-duty gas-spring monitor arm.' },
      { suffix: 'Calibrated Studio Edition', priceMultiplier: 1.25, spec: 'Includes custom color calibration certificate.' },
    ],
  },
  {
    name: 'Networking & Wi-Fi',
    photoIds: [
      'photo-1633113214698-485cdb5b4b8c',
      'photo-1544197150-b99a580bb7a8',
      'photo-1544716278-ca5e3f4abd8c',
    ],
    brands: ['TP-Link', 'Ubiquiti', 'Cisco', 'Netgear', 'MikroTik', 'D-Link'],
    models: [
      { name: 'Archer AXE75 Tri-Band Wi-Fi 6E Gigabit Router', basePrice: 11999, descTemplate: 'Up to 5400 Mbps total bandwidth with dedicated 6GHz band, 1.7 GHz quad-core CPU, OneMesh support, and 6 high-gain antennas.' },
      { name: 'UniFi Dream Machine Pro Security Gateway', basePrice: 38999, descTemplate: 'All-in-one enterprise network controller with 10G SFP+ WAN/LAN, integrated 8-port switch, and advanced threat detection.' },
      { name: 'Business 250 Series 24-Port Gigabit Smart Switch', basePrice: 24999, descTemplate: '24 x 10/100/1000 ports plus 4 x 10G SFP+ uplinks, Layer 2 management, QoS, VLAN support, and fanless energy-efficient design.' },
      { name: 'UniFi 6 Pro High-Density Ceiling Access Point', basePrice: 16499, descTemplate: 'Wi-Fi 6 AP supporting 300+ concurrent clients, 5.3 Gbps aggregate throughput, IP54 weather rating, and PoE+ power.' },
      { name: 'Nighthawk 8-Stream AX6000 Mesh Wi-Fi System', basePrice: 29999, descTemplate: 'Whole-office mesh coverage up to 5000 sq ft, 4x4 MU-MIMO, multi-gigabit Ethernet WAN, and automatic firmware security updates.' },
      { name: 'Cloud Router Switch 8-Port SFP+ 10GbE', basePrice: 22999, descTemplate: 'Wire-speed 10 Gigabit connectivity across 8 SFP+ cages, dual boot RouterOS/SwOS, and rackmount metallic enclosure.' },
    ],
    modifiers: [
      { suffix: 'Standalone Unit', priceMultiplier: 1.0, spec: 'Single device with power adapter.' },
      { suffix: '2-Pack Mesh Extension', priceMultiplier: 1.85, spec: 'Includes satellite node for expanded range.' },
      { suffix: 'PoE+ Injector Bundle', priceMultiplier: 1.1, spec: 'Includes certified gigabit PoE+ power injector.' },
    ],
  },
  {
    name: 'Storage & Memory',
    photoIds: [
      'photo-1597872200969-2b65d56bd16b',
      'photo-1550009158-9ebf69173e03',
      'photo-1562975079-6a693b79da60',
    ],
    brands: ['Samsung', 'Crucial', 'Western Digital', 'SanDisk', 'Kingston', 'Seagate'],
    models: [
      { name: '990 PRO PCIe 4.0 NVMe M.2 Internal SSD', basePrice: 10499, descTemplate: 'Blistering sequential read/write speeds up to 7450/6900 MB/s, custom thermal controller, and 5-year limited warranty.' },
      { name: 'Extreme Portable Rugged External SSD V2', basePrice: 12999, descTemplate: 'NVMe solid state performance in a durable IP55 water and dust-resistant casing with USB-C 1050MB/s transfer rates.' },
      { name: 'Red Pro 7200 RPM Enterprise NAS Hard Drive', basePrice: 26999, descTemplate: 'Engineered for up to 24-bay commercial NAS systems, 300TB/year workload rating, CMR recording, and vibration sensors.' },
      { name: 'Fury Beast DDR5 5600MHz Desktop Memory Kit', basePrice: 9499, descTemplate: 'Low-profile aluminum heat spreader, Intel XMP 3.0 ready, on-die ECC reliability, and aggressive performance timings.' },
      { name: 'T700 PCIe 5.0 Ultra-Speed NVMe SSD', basePrice: 18999, descTemplate: 'Extreme next-generation speeds up to 12400 MB/s with premium aluminum/copper heatsink for enthusiast workstations.' },
      { name: 'IronWolf Pro Commercial Enterprise NAS HDD', basePrice: 24999, descTemplate: 'AgileArray firmware, 2.5M hours MTBF, rotational vibration sensors, and 3 years of Rescue Data Recovery Services.' },
    ],
    modifiers: [
      { suffix: '1TB Edition', priceMultiplier: 1.0, spec: '1TB capacity tier.' },
      { suffix: '2TB High Capacity', priceMultiplier: 1.7, spec: '2TB capacity tier with doubled cache.' },
      { suffix: '4TB Enterprise Tier', priceMultiplier: 3.1, spec: '4TB maximum density for high-demand databases.' },
    ],
  },
  {
    name: 'Keyboards & Mice',
    photoIds: [
      'photo-1587829741301-dc798b83add3',
      'photo-1527814050087-3793815479db',
      'photo-1618384887929-16ec33fab9ef',
      'photo-1588702547919-26089e690ecc',
    ],
    brands: ['Logitech', 'Keychron', 'Microsoft', 'Razer', 'Corsair', 'Dell'],
    models: [
      { name: 'MX Master 3S Wireless Performance Mouse', basePrice: 8995, descTemplate: '8K DPI any-surface glass tracking, Quiet Click switches, MagSpeed electromagnetic scrolling, and multi-computer Flow support.' },
      { name: 'MX Keys S Advanced Wireless Illuminated Keyboard', basePrice: 10995, descTemplate: 'Spherically dished keys matched to fingertips, smart backlighting proximity sensors, dual Bluetooth/Bolt connectivity.' },
      { name: 'Q3 Pro Custom Wireless Mechanical Keyboard', basePrice: 17999, descTemplate: 'Full CNC aluminum body, hot-swappable switches, double-gasket acoustic mount, screw-in stabilizers, and QMK/VIA support.' },
      { name: 'Ergonomic Split Sculpt Business Keyboard', basePrice: 6499, descTemplate: 'Natural arc split keyset and cushioned palm rest to encourage relaxed wrist alignment and prevent repetitive strain.' },
      { name: 'DeathAdder V3 Pro Ultra-Lightweight Mouse', basePrice: 11999, descTemplate: '63g ergonomic featherweight design, Focus Pro 30K optical sensor, Gen-3 optical switches, and 90-hour battery life.' },
      { name: 'Signature M650 Wireless Business Mouse', basePrice: 2995, descTemplate: 'SmartWheel adaptive scrolling, SilentTouch technology, comfort rubber grips, and programmable customizable side buttons.' },
    ],
    modifiers: [
      { suffix: 'Graphite Black', priceMultiplier: 1.0, spec: 'Standard professional graphite finish.' },
      { suffix: 'Pale Gray Business Edition', priceMultiplier: 1.05, spec: 'Modern clean off-white minimalist color.' },
      { suffix: 'Combo with Desk Mat', priceMultiplier: 1.2, spec: 'Includes matching water-repellent microfiber desk mat.' },
    ],
  },
  {
    name: 'Audio & Headsets',
    photoIds: [
      'photo-1505740420928-5e560c06d30e',
      'photo-1484704849700-f032a568e944',
      'photo-1546435770-a3e426bf472b',
    ],
    brands: ['Sony', 'Bose', 'Sennheiser', 'Jabra', 'Shure', 'Audio-Technica'],
    models: [
      { name: 'WH-1000XM5 Wireless Noise Canceling Headphones', basePrice: 26990, descTemplate: 'Industry-leading noise cancellation with two processors and 8 microphones, LDAC Hi-Res audio, and 30-hour battery life.' },
      { name: 'QuietComfort Ultra Spatial Audio Headphones', basePrice: 32900, descTemplate: 'World-class active noise cancellation with breakthrough Bose Immersive Audio, CustomTune sound personalization, and luxury comfort.' },
      { name: 'Evolve2 85 Professional UC Wireless Headset', basePrice: 34999, descTemplate: 'Digital hybrid ANC, 10-microphone call technology, integrated 360-degree busylight, certified for Microsoft Teams and Zoom.' },
      { name: 'Momentum 4 Wireless Audiophile Headset', basePrice: 24990, descTemplate: 'Audiophile-inspired 42mm acoustic transducer system, customizable sound with built-in EQ, and exceptional 60-hour battery.' },
      { name: 'MV7 USB/XLR Dynamic Broadcast Microphone', basePrice: 21999, descTemplate: 'Voice Isolation technology, intuitive touch panel controls, built-in headphone monitoring, and ShurePlus MOTIV app integration.' },
      { name: 'ATH-M50xBT2 Professional Studio Monitor Headphones', basePrice: 16990, descTemplate: 'Critically acclaimed sonic performance with 45mm large-aperture drivers, 90-degree swiveling earcups, and dual mic beamforming.' },
    ],
    modifiers: [
      { suffix: 'Standard Edition', priceMultiplier: 1.0, spec: 'Includes carry case and cables.' },
      { suffix: 'Charging Stand Bundle', priceMultiplier: 1.15, spec: 'Includes dedicated desktop magnetic charging dock.' },
      { suffix: 'Enterprise UC Dongle Pack', priceMultiplier: 1.12, spec: 'Includes pre-paired USB-A/C wireless PC adapter.' },
    ],
  },
  {
    name: 'Cables & Adapters',
    photoIds: [
      'photo-1625842268584-8f3296236761',
      'photo-1544716278-ca5e3f4abd8c',
      'photo-1563770660941-20978e870e26',
    ],
    brands: ['Anker', 'Belkin', 'UGREEN', 'Cable Matters', 'StarTech', 'Satechi'],
    models: [
      { name: 'PowerLine III Flow USB-C to USB-C 100W Cable', basePrice: 1299, descTemplate: 'Ultra-flexible silicone braided 100W PD charging cable tested to 25000 bends, tangle-free design for laptops and tablets.' },
      { name: 'Ultra High Speed HDMI 2.1 Certified 8K Cable', basePrice: 1799, descTemplate: '48Gbps bandwidth supporting 8K@60Hz and 4K@120Hz, Dolby Vision, eARC, dynamic HDR, and heavy-duty gold-plated contacts.' },
      { name: 'Active Thunderbolt 4 40Gbps High-Bandwidth Cable', basePrice: 3999, descTemplate: 'Intel certified 40Gbps data transfer, 100W Power Delivery, and dual 4K/single 8K video output for docking stations.' },
      { name: 'Multiport 9-in-1 Dual 4K USB-C Hub Adapter', basePrice: 4299, descTemplate: 'Dual HDMI displays, 100W PD passthrough, Gigabit Ethernet RJ45, SD/TF card slots, and 3x USB 3.0 high-speed ports.' },
      { name: 'USB-C to 2.5Gbps Multi-Gigabit Ethernet Adapter', basePrice: 2499, descTemplate: 'Upgrades modern laptops to 2.5x standard Gigabit networking speeds with premium aluminum casing and activity status LEDs.' },
      { name: 'DisplayPort 1.4 to HDMI 2.1 Active 4K120Hz Adapter', basePrice: 2199, descTemplate: 'Converts graphics card DisplayPort output to high-refresh HDMI 2.1 for professional displays and 4K HDR TVs.' },
    ],
    modifiers: [
      { suffix: '1 Meter Length', priceMultiplier: 1.0, spec: '1m compact length for desks.' },
      { suffix: '2 Meter Braided', priceMultiplier: 1.25, spec: '2m extended reinforced braided length.' },
      { suffix: '3 Meter Enterprise Run', priceMultiplier: 1.5, spec: '3m heavy-gauge commercial installation run.' },
    ],
  },
  {
    name: 'Power & Charging',
    photoIds: [
      'photo-1585338107529-13afc5f02586',
      'photo-1609091839311-d5365f9ff1c5',
      'photo-1544716278-ca5e3f4abd8c',
    ],
    brands: ['Anker', 'APC', 'Baseus', 'UGREEN', 'Belkin', 'CyberPower'],
    models: [
      { name: 'Prime 200W GaN 6-Port Desktop Charging Station', basePrice: 8999, descTemplate: 'GaNPrime tech delivering 200W combined power across 4 USB-C and 2 USB-A ports, capable of charging two laptops simultaneously.' },
      { name: 'Back-UPS Pro 1500VA Sine Wave UPS System', basePrice: 22499, descTemplate: 'Pure sine wave battery backup with automatic voltage regulation (AVR), LCD status screen, and 8 surge-protected battery outlets.' },
      { name: 'Nexode 140W Multiport GaN Fast Wall Charger', basePrice: 6499, descTemplate: 'PD 3.1 140W single-port output for fast-charging 16-inch laptops with foldable travel prongs and smart thermal protection.' },
      { name: '24000mAh 140W Laptop Power Bank with Smart Display', basePrice: 9999, descTemplate: 'High-density airline-safe portable battery pack with real-time output wattage display and bi-directional 140W fast recharge.' },
      { name: 'Essential SurgeArrest 6-Outlet Surge Protector 2M', basePrice: 1899, descTemplate: 'Professional surge suppression with 1836 Joules rating, child safety shutters, circuit breaker, and heavy-duty 2m power cord.' },
      { name: 'MagSafe 3-in-1 Wireless Fast Charging Tree', basePrice: 7999, descTemplate: 'Fast wireless charging for iPhone, Apple Watch, and AirPods concurrently with solid weighted base and premium soft-touch finish.' },
    ],
    modifiers: [
      { suffix: 'Standard Unit', priceMultiplier: 1.0, spec: 'Complete power unit with standard warranty.' },
      { suffix: 'Surge Insurance Pack', priceMultiplier: 1.15, spec: 'Includes equipment protection policy.' },
      { suffix: 'Dual Unit Office Pack', priceMultiplier: 1.9, spec: 'Two matching units for workstations.' },
    ],
  },
  {
    name: 'Cameras & Surveillance',
    photoIds: [
      'photo-1558655146-d09347e92766',
      'photo-1616469829941-c7200edec809',
      'photo-1507473885765-e6ed057f782c',
    ],
    brands: ['Logitech', 'Hikvision', 'Elgato', 'Insta360', 'Dahua', 'CP PLUS'],
    models: [
      { name: 'Brio 4K Ultra HD Pro Business Webcam', basePrice: 16995, descTemplate: '4K recording with RightLight 3 HDR, dual omnidirectional noise-canceling mics, 5x digital zoom, and Windows Hello facial recognition.' },
      { name: '4K ColorVu Outdoor PoE Turret IP Camera', basePrice: 11499, descTemplate: 'Full-time color imaging day and night, 130dB WDR, IP67 weatherproof metal housing, built-in mic, and deep learning analytics.' },
      { name: 'Facecam Pro 4K60 Ultra-Low Latency Camera', basePrice: 28999, descTemplate: 'Studio-grade Sony STARVIS sensor with true 4K at 60fps, 21mm f/2.0 optical lens, onboard flash memory, and zero video compression.' },
      { name: 'Link AI-Powered 4K PTZ Gimbal Webcam', basePrice: 26999, descTemplate: 'AI tracking gimbal keeping you centered in frame, 1/2-inch sensor for low-light clarity, gesture controls, and dual mics.' },
      { name: '8-Channel 4K NVR Network Video Recorder with PoE', basePrice: 18499, descTemplate: 'Plug-and-play PoE ports for 8 IP cameras, up to 10TB SATA storage support, H.265+ compression, and remote mobile viewing.' },
      { name: 'C920 Pro HD Full 1080p Conference Webcam', basePrice: 6995, descTemplate: 'Crisp 1080p video calls, automated light correction, dual stereo microphones, and universal clip fitting any monitor or tripod.' },
    ],
    modifiers: [
      { suffix: 'Standard Camera', priceMultiplier: 1.0, spec: 'Complete camera kit.' },
      { suffix: 'Tripod & Privacy Shutter Kit', priceMultiplier: 1.1, spec: 'Includes mini adjustable tripod and magnetic privacy cap.' },
      { suffix: 'PoE Switch & Cable Bundle', priceMultiplier: 1.25, spec: 'Includes 30m outdoor CAT6 cable and PoE power supply.' },
    ],
  },
  {
    name: 'Office & Desk Setup',
    photoIds: [
      'photo-1507473885765-e6ed057f782c',
      'photo-1527864550417-7fd91fc51a46',
      'photo-1544716278-ca5e3f4abd8c',
    ],
    brands: ['Ergotron', 'Grovemade', 'Fellowes', 'Kensington', 'BenQ', 'Steelcase'],
    models: [
      { name: 'LX Desk Mount Heavy-Duty Monitor Arm', basePrice: 16999, descTemplate: 'Patented Constant Force lift-and-pivot technology, holds up to 11.3 kg, 10000-cycle tested, and integrated cable routing channels.' },
      { name: 'ScreenBar Halo Wireless Dial Monitor Light', basePrice: 14999, descTemplate: 'Non-glare asymmetric optical design, backlighting bias mode, wireless smart controller puck, and automatic ambient dimming.' },
      { name: 'Walnut Solid Hardwood Desk Shelf System', basePrice: 18499, descTemplate: 'Handcrafted American walnut wood with aluminum shelves, creates dual-level ergonomic desk organization for dual monitors.' },
      { name: 'SmartFit SoleMate Professional Ergonomic Footrest', basePrice: 4299, descTemplate: 'Clinically designed footrest to optimize posture and blood circulation, adjustable angle and height with non-skid surface.' },
      { name: 'Aluminium Heavy-Duty Dual Laptop Vertical Stand', basePrice: 2499, descTemplate: 'Saves desk space by storing two laptops upright, CNC machined sandblasted aluminum with protective non-scratch silicone pads.' },
      { name: 'Powershred 12-Sheet Cross-Cut Heavy Duty Shredder', basePrice: 13999, descTemplate: '100% Jam Proof system, SafeSense technology stopping upon touch, and silent shredding of paper, credit cards, and staples.' },
    ],
    modifiers: [
      { suffix: 'Single Pack', priceMultiplier: 1.0, spec: 'Standard unit.' },
      { suffix: 'Dual Workstation Set', priceMultiplier: 1.85, spec: 'Matching set for two desks.' },
      { suffix: 'Premium Wood Edition', priceMultiplier: 1.25, spec: 'Solid hardwood upgrade with protective oil finish.' },
    ],
  },
  {
    name: 'Printers & Scanners',
    photoIds: [
      'photo-1612815154858-60aa4c59eaa6',
      'photo-1588872657578-7efd1f1555ed',
      'photo-1544716278-ca5e3f4abd8c',
    ],
    brands: ['HP', 'Canon', 'Brother', 'Epson', 'Zebra'],
    models: [
      { name: 'LaserJet Pro MFP 3101fdw All-in-One Laser Printer', basePrice: 28999, descTemplate: 'Fast duplex printing up to 35 ppm, automatic document feeder, auto-heal dual-band Wi-Fi, and smart enterprise fleet management.' },
      { name: 'imageCLASS MF445dw Commercial Duplex Laser', basePrice: 38499, descTemplate: 'High-volume 40 ppm mono laser with 5-inch color touchscreen, single-pass double-sided scanning, and expandable 900-sheet paper capacity.' },
      { name: 'EcoTank Pro ET-5850 Supertank All-in-One Color Printer', basePrice: 56999, descTemplate: 'Cartridge-free ink tank printing with ultra-low cost per page, pigment-based DURABrite inks, and zero warmup time.' },
      { name: 'HL-L6200DW Enterprise Workgroup Mono Laser', basePrice: 34999, descTemplate: 'Heavy-duty 48 ppm printer engineered for high-output business environments with Gigabit Ethernet and 12000-page high-yield toner.' },
      { name: 'ZD421 Direct Thermal Desktop Barcode Label Printer', basePrice: 22499, descTemplate: '203 dpi thermal barcode label printing with USB/Ethernet connectivity, movable sensor, and 6 ips maximum print speed.' },
      { name: 'CanoScan LiDE 400 High-Speed Flatbed Scanner', basePrice: 7999, descTemplate: '4800 x 4800 dpi optical resolution, 8-second rapid scanning, USB-C powered, and vertical upright scanning stand.' },
    ],
    modifiers: [
      { suffix: 'Standard Unit', priceMultiplier: 1.0, spec: 'Includes starter toner/ink and cables.' },
      { suffix: 'High-Yield Toner Bundle', priceMultiplier: 1.28, spec: 'Includes extra high-yield toner cartridge (6000 pages).' },
      { suffix: 'Extended Paper Tray Pack', priceMultiplier: 1.22, spec: 'Includes additional 520-sheet lower paper feeder cassette.' },
    ],
  },
  {
    name: 'PC Components & Cooling',
    photoIds: [
      'photo-1591488320449-011701bb6704',
      'photo-1550009158-9ebf69173e03',
      'photo-1587202372775-e229f172b9d7',
    ],
    brands: ['Corsair', 'Noctua', 'ASUS', 'NZXT', 'Cooler Master', 'MSI'],
    models: [
      { name: 'RM1000x Shift 80 PLUS Gold Fully Modular PSU', basePrice: 17499, descTemplate: 'Side-mounted modular connectors, ATX 3.0 compliant with native PCIe 5.0 12VHPWR cable, and 100% Japanese 105C capacitors.' },
      { name: 'NH-D15 chromax.black Dual-Tower CPU Cooler', basePrice: 9999, descTemplate: 'Elite dual-tower heatsink with six heatpipes, dual NF-A15 140mm fans, award-winning quiet cooling performance, and SecuFirm2 mounting.' },
      { name: 'Kraken Elite 360 RGB All-in-One Liquid Cooler', basePrice: 24999, descTemplate: '2.36-inch customizable wide-angle LCD display, high-efficiency Asetek pump, F120 RGB Core fans, and reinforced braided tubing.' },
      { name: 'ROG Strix B760-F Gaming WiFi Motherboard', basePrice: 23999, descTemplate: 'Robust 16+1 power stages, PCIe 5.0 x16 slot, three M.2 heatsinks, Wi-Fi 6E, 2.5G Intel LAN, and pre-mounted I/O shield.' },
      { name: 'MasterBox TD500 Mesh V2 High-Airflow Case', basePrice: 8499, descTemplate: 'Polygonal fine mesh front panel, three CF120 ARGB fans included, crystalline tempered glass side panel, and USB 3.2 Gen2 Type-C.' },
      { name: 'GeForce RTX 4070 Super 12GB Triple-Fan Graphics Card', basePrice: 62999, descTemplate: 'Ada Lovelace architecture, DLSS 3 frame generation, axial-tech cooling fans, dual BIOS, and rigid metal backplate.' },
    ],
    modifiers: [
      { suffix: 'Black Edition', priceMultiplier: 1.0, spec: 'Stealth matte black industrial finish.' },
      { suffix: 'White Arctic Edition', priceMultiplier: 1.08, spec: 'Premium all-white chassis and component finish.' },
      { suffix: 'ARGB Lighting Sync Kit', priceMultiplier: 1.15, spec: 'Includes digital ARGB hub and addressable cable extensions.' },
    ],
  },
];

async function seed() {
  console.log('🚀 Seeding 2000+ Products across 12 Categories into Turso DB...');

  // 1. Ensure categories exist
  const existingCats = await client.execute('SELECT id, name FROM categories');
  const catMap = new Map<string, number>();
  for (const row of existingCats.rows) {
    catMap.set(String(row.name), Number(row.id));
  }

  for (const cat of CATEGORIES) {
    if (!catMap.has(cat.name)) {
      const res = await client.execute({
        sql: 'INSERT INTO categories(name) VALUES(?) RETURNING id',
        args: [cat.name],
      });
      catMap.set(cat.name, Number(res.rows[0].id));
      console.log(` Created category: ${cat.name} (id: ${res.rows[0].id})`);
    }
  }

  // Count existing products
  const countBefore = await client.execute('SELECT COUNT(*) n FROM products');
  const existingTotal = Number(countBefore.rows[0]?.n ?? 0);
  console.log(`Current product count: ${existingTotal}`);

  const TARGET_PRODUCTS = 2100;
  if (existingTotal >= TARGET_PRODUCTS) {
    console.log(`Database already has ${existingTotal} products (>= ${TARGET_PRODUCTS}). Done.`);
    return;
  }

  const needed = TARGET_PRODUCTS - existingTotal;
  console.log(`Generating ${needed} additional products...`);

  // Target per category ~175
  const perCat = Math.ceil(needed / CATEGORIES.length);
  let generated = 0;

  for (const cat of CATEGORIES) {
    const categoryId = catMap.get(cat.name)!;
    console.log(`\n📦 Generating products for "${cat.name}" (target: ${perCat})...`);

    // Prepare batches of 100 products for fast transactions
    let batch: { name: string; description: string; price: number; categoryId: number; images: string[] }[] = [];

    for (let i = 0; i < perCat && generated < needed; i++) {
      const brand = cat.brands[i % cat.brands.length];
      const model = cat.models[i % cat.models.length];
      const mod = cat.modifiers[i % cat.modifiers.length];

      // Realistic serial / model code e.g. PRO-204
      const code = 100 + Math.floor((i * 7) % 900);
      const productName = `${brand} ${model.name} (${mod.suffix} #${code})`;

      const price = Math.round(model.basePrice * mod.priceMultiplier);
      const description = `${model.descTemplate} ${mod.spec} Guaranteed genuine quality backed by Pro Tech Enterprises warranty.`;

      // Select 3 distinct original photos from category photo IDs
      const photo1 = cat.photoIds[i % cat.photoIds.length];
      const photo2 = cat.photoIds[(i + 1) % cat.photoIds.length];
      const photo3 = cat.photoIds[(i + 2) % cat.photoIds.length];

      batch.push({
        name: productName,
        description,
        price,
        categoryId,
        images: [photo1, photo2, photo3],
      });

      generated++;

      // When batch reaches 50 or at end of category, insert in transaction
      if (batch.length >= 50 || i === perCat - 1 || generated >= needed) {
        const tx = await client.transaction('write');
        try {
          for (const item of batch) {
            const ins = await tx.execute({
              sql: 'INSERT INTO products(name, description, price, category_id) VALUES(?, ?, ?, ?) RETURNING id',
              args: [item.name, item.description, item.price, item.categoryId],
            });
            const pId = Number(ins.rows[0].id);

            for (let s = 0; s < item.images.length; s++) {
              await tx.execute({
                sql: 'INSERT INTO product_images(product_id, public_id, version, sort_order) VALUES(?, ?, ?, ?)',
                args: [pId, `seed/${item.images[s]}#p${pId}_s${s}`, '1', s],
              });
            }
          }
          await tx.commit();
          process.stdout.write(`  Inserted ${batch.length} products (Total generated: ${generated}/${needed})\r`);
        } catch (err) {
          await tx.rollback();
          console.error('Batch insert failed:', err);
          throw err;
        }
        batch = [];
      }
    }
  }

  const countAfter = await client.execute('SELECT COUNT(*) n FROM products');
  const catsAfter = await client.execute('SELECT COUNT(*) n FROM categories');
  const imagesAfter = await client.execute('SELECT COUNT(*) n FROM product_images');

  console.log('\n\n════════════════════════════════════════════════════════');
  console.log(`🎉 SUCCESSFUL SEEDING COMPLETE!`);
  console.log(`📦 Total Products in Turso DB: ${countAfter.rows[0].n}`);
  console.log(`🏷️  Total Categories: ${catsAfter.rows[0].n}`);
  console.log(`🖼️  Total Product Photos: ${imagesAfter.rows[0].n}`);
  console.log('════════════════════════════════════════════════════════\n');
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
