# Noble BarMetrics

A weight-based bar inventory management system that calculates remaining liquor volume from bottle weight measurements.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Core Concepts](#core-concepts)
  - [Weight-to-Volume Calculation](#weight-to-volume-calculation)
  - [Density and ABV](#density-and-abv)
  - [Calibration](#calibration)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Noble BarMetrics provides accurate liquor inventory tracking by measuring bottle weights and calculating remaining volume using alcohol-specific density values. This approach eliminates guesswork and provides precise pour counts for cost control.

**Key Benefits:**
- Accurate inventory counts without visual estimation
- Automatic volume calculation based on alcohol density
- Track pours remaining per bottle
- Session-based inventory for periodic counts
- Support for multiple bar locations

---

## Features

- **Product Management**: Maintain a catalog of liquor products with brand, category, ABV, and bottle specifications
- **Bottle Calibration**: Store tare weights (empty bottle weights) for accurate measurements
- **Measurement Sessions**: Organize inventory counts by date and location
- **Volume Calculations**: Automatic conversion from weight to volume using ABV-based density
- **Pour Tracking**: Calculate remaining standard pours per bottle
- **Category Support**: Vodka, Gin, Whiskey, Rum, Tequila, Brandy, Liqueur, Cognac, Scotch, Bourbon, and more

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Next.js   │  │  React 19   │  │  Radix UI + Tailwind│  │
│  │  App Router │  │  Components │  │     Components      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     Business Logic                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Calculations│  │ Validations │  │   React Hook Form   │  │
│  │   (lib/)    │  │   (Zod)     │  │    + Resolvers      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Prisma ORM + SQLite                     │    │
│  │   Products │ Calibrations │ Sessions │ Measurements  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js | 16.1.6 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Database | SQLite (via Prisma) | - |
| ORM | Prisma | 7.3.0 |
| Styling | Tailwind CSS | 4.x |
| UI Components | Radix UI | Various |
| Forms | React Hook Form | 7.71.1 |
| Validation | Zod | 4.3.6 |
| Testing | Vitest | 4.0.18 |
| Testing Utils | Testing Library | 16.3.2 |

---

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AbelTimo/Noble-BarMetrics.git
   cd Noble-BarMetrics/barmetrics
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

   Configure the `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="file:./dev.db"
   ```

### Database Setup

1. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

2. Push schema to database:
   ```bash
   npm run db:push
   ```

3. Seed with sample data (optional):
   ```bash
   npm run db:seed
   ```

4. Open Prisma Studio to view data (optional):
   ```bash
   npm run db:studio
   ```

### Running the Application

**Development:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

**Production build:**
```bash
npm run build
npm start
```

---

## Project Structure

```
barmetrics/
├── prisma/
│   ├── schema.prisma      # Database schema definition
│   └── seed.ts            # Sample data seeding script
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── layout.tsx     # Root layout
│   │   ├── page.tsx       # Home page
│   │   └── globals.css    # Global styles
│   ├── components/
│   │   └── ui/            # Reusable UI components (Radix-based)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── badge.tsx
│   │       ├── progress.tsx
│   │       └── separator.tsx
│   └── lib/               # Core business logic
│       ├── calculations.ts # Volume/density calculations
│       ├── validations.ts  # Zod schemas for forms
│       ├── db.ts           # Prisma client singleton
│       └── utils.ts        # Utility functions
├── package.json
├── tsconfig.json
└── README.md
```

---

## Core Concepts

### Weight-to-Volume Calculation

The system calculates liquid volume using the formula:

```
Volume (ml) = Net Mass (g) / Density (g/ml)
```

Where:
- **Net Mass** = Gross Weight (measured) - Tare Weight (empty bottle)
- **Density** = Determined by the alcohol content (ABV)

### Density and ABV

Alcohol is less dense than water. The density decreases as ABV increases:

| ABV % | Density (g/ml) |
|-------|----------------|
| 0 (water) | 1.000 |
| 20 | 0.969 |
| 40 (standard spirits) | 0.938 |
| 50 (100 proof) | 0.922 |
| 60 (cask strength) | 0.906 |

The system uses linear interpolation for ABV values between table entries.

### Calibration

Accurate tare weights are essential for precise measurements. The system supports three calibration methods:

1. **MEASURED_EMPTY**: Weigh an actual empty bottle
2. **MEASURED_FULL**: Calculate from a full bottle's known weight
3. **ESTIMATED**: Use industry-standard estimates based on bottle size

**Typical tare weights by bottle size:**

| Size (ml) | Tare Weight (g) |
|-----------|-----------------|
| 375 | 280 |
| 750 | 480 |
| 1000 | 560 |
| 1750 | 800 |

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────────┐
│     Product     │       │   BottleCalibration  │
├─────────────────┤       ├──────────────────────┤
│ id              │◄──────│ productId            │
│ brand           │       │ id                   │
│ productName     │       │ tareWeightG          │
│ category        │       │ fullBottleWeightG    │
│ abvPercent      │       │ calibrationMethod    │
│ nominalVolumeMl │       │ notes                │
│ defaultDensity  │       │ createdAt            │
│ defaultTareG    │       │ updatedAt            │
│ isActive        │       └──────────────────────┘
│ createdAt       │                │
│ updatedAt       │                │
└─────────────────┘                │
        │                          │
        │                          ▼
        │              ┌──────────────────────┐
        │              │  BottleMeasurement   │
        │              ├──────────────────────┤
        └──────────────│ productId            │
                       │ calibrationId        │
        ┌──────────────│ sessionId            │
        │              │ id                   │
        │              │ grossWeightG         │
        │              │ tareWeightG          │
        │              │ netMassG             │
        ▼              │ densityGPerMl        │
┌─────────────────┐    │ volumeMl             │
│MeasurementSession│   │ volumeL              │
├─────────────────┤    │ percentFull          │
│ id              │    │ poursRemaining       │
│ name            │    │ standardPourMl       │
│ location        │    │ measuredAt           │
│ startedAt       │    └──────────────────────┘
│ completedAt     │
└─────────────────┘
```

### Models

#### Product
Stores liquor product information including brand, name, category, ABV, and bottle specifications.

#### BottleCalibration
Stores calibrated tare weights for specific products. Multiple calibrations can exist per product (e.g., different bottle batches).

#### MeasurementSession
Groups measurements for a specific inventory count, with optional name and location.

#### BottleMeasurement
Individual bottle weight measurements with calculated volume and pour data.

---

## API Reference

See [docs/API.md](docs/API.md) for complete API documentation.

### Validation Schemas

All input data is validated using Zod schemas defined in `src/lib/validations.ts`:

| Schema | Purpose |
|--------|---------|
| `productSchema` | Validate product creation/updates |
| `calibrationSchema` | Validate calibration data |
| `sessionSchema` | Validate session data |
| `measurementSchema` | Validate measurement input |
| `quickMeasurementSchema` | Simplified measurement input |

---

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

**Note:** For production, consider using PostgreSQL instead of SQLite. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Write tests for new functionality
- Update documentation for API changes
- Use meaningful commit messages

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For questions or issues, please open a GitHub issue or contact the development team.
