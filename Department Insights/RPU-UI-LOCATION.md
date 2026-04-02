# RPU Display Location in UI

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                 Key Accounts Department Journey              │
│                                                              │
│                    Department Journey                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│  April 2025  │  May 2025    │  June 2025   │  July 2025   │
│              │              │              │              │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │Brand Count│ │ │Brand Count│ │ │Brand Count│ │ │Brand Count│ │
│ │   755     │ │ │   797     │ │ │   873     │ │ │   920     │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │
│              │              │              │              │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │Outlet Cnt │ │ │Outlet Cnt │ │ │Outlet Cnt │ │ │Outlet Cnt │ │
│ │  19571    │ │ │  20429    │ │ │  21508    │ │ │  22230    │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │
│              │              │              │              │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │ Revenue  │ │ │ Revenue  │ │ │ Revenue  │ │ │ Revenue  │ │
│ │ New: ₹18B│ │ │ New: ₹4B │ │ │ New: ₹7B │ │ │ New: ₹6B │ │
│ │ Ren: ₹9B │ │ │ Ren: ₹6B │ │ │ Ren: ₹6B │ │ │ Ren: ₹9B │ │
│ │ Tot: ₹27B│ │ │ Tot: ₹10B│ │ │ Tot: ₹13B│ │ │ Tot: ₹15B│ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │
│              │              │              │              │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │
│ │RPU (Brand)│ │ │RPU (Brand)│ │ │RPU (Brand)│ │ │RPU (Brand)│ │
│ │ New: ₹23M│ │ │ New: ₹5M │ │ │ New: ₹8M │ │ │ New: ₹6M │ │
│ │ Ren: ₹13M│ │ │ Ren: ₹7M │ │ │ Ren: ₹6M │ │ │ Ren: ₹10M│ │
│ │ Tot: ₹37M│ │ │ Tot: ₹12M│ │ │ Tot: ₹14M│ │ │ Tot: ₹16M│ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │
│   (BLUE)     │   (BLUE)     │   (BLUE)     │   (BLUE)     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Color Coding

- **Gray Background** (`#f3f4f6`): Brand Count, Outlet Count, Revenue
- **Blue Background** (`#e0f2fe`): RPU (NEW) ← This makes it easy to spot!

## Component Structure

```typescript
<Milestone>
  ├── Date Header (April 2025)
  ├── Label (if any)
  └── Metrics Cards
      ├── Brand Count (Department only)
      ├── Outlet Count
      ├── Revenue (Gray)
      │   ├── New
      │   ├── Renewal
      │   └── Total
      └── RPU (Blue) ← NEW SECTION
          ├── New
          ├── Renewal
          └── Total
</Milestone>
```

## Exact File Location

**File**: `components/Milestone.tsx`
**Lines**: 90-120

```typescript
{/* RPU (Revenue Per Unit) */}
<motion.div 
  className="p-2 rounded"
  style={{ backgroundColor: '#e0f2fe' }}  // Light blue
  whileHover={{ backgroundColor: '#bae6fd' }}  // Darker blue on hover
  transition={{ duration: 0.2 }}
>
  <div className="text-xs text-gray-600 mb-1">
    RPU {isDept ? '(per Brand)' : '(per Outlet)'}
  </div>
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-gray-600">New:</span>
      <span className="font-medium text-gray-800">
        ₹{(metrics.rpu.new || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </span>
    </div>
    <div className="flex justify-between text-xs">
      <span className="text-gray-600">Renewal:</span>
      <span className="font-medium text-gray-800">
        ₹{(metrics.rpu.renewal || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </span>
    </div>
    <div className="flex justify-between text-xs pt-1 border-t border-blue-300">
      <span className="text-gray-700 font-medium">Total:</span>
      <span className="font-semibold text-gray-900">
        ₹{(metrics.rpu.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </span>
    </div>
  </div>
</motion.div>
```

## How to Test

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/dashboard/key-accounts-department-journey`

3. Look for the **blue-colored card** at the bottom of each milestone

4. The RPU card will show:
   - Header: "RPU (per Brand)" for department view
   - Header: "RPU (per Outlet)" for brand view
   - Three values: New, Renewal, Total

## Screenshots Reference

Based on your screenshot, the RPU section will appear as the 4th card in each milestone column, right below the Revenue card, with a distinctive blue background.
