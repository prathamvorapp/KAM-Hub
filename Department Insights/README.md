# Brand Journey Dashboard

A Next.js dashboard application that visualizes Key Accounts Department and Brand journeys as interactive roadmaps.

## Project Structure

```
├── app/              # Next.js App Router pages and layouts
├── components/       # React UI components
├── lib/              # Data processing and business logic
├── Data/             # CSV data files
└── node_modules/     # Dependencies
```

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** (strict mode)
- **React 18**
- **Framer Motion** for animations
- **papaparse** for CSV parsing
- **date-fns** for date manipulation
- **fast-check** for property-based testing
- **Vitest** for unit testing

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

### Run Tests

```bash
npm test
```

## CSV Data Files

Place your CSV files in the `/Data` folder:
- `Brand DATA CSV.csv`
- `KAM Data CSV.csv`
- `Price Data CSV.csv`

## Development

This project follows a spec-driven development approach. See `.kiro/specs/brand-journey-dashboard/` for:
- Requirements document
- Design document
- Implementation tasks
