# SCI Scale Adjustment - Explained

## Why Scale Adjustment?

The scale adjustment ensures that brands with more outlets get a higher SCI, reflecting that:
1. Larger brands have more integration touchpoints
2. Switching costs increase with scale
3. Managing multiple outlets with integrated products is more complex

## The Formula

```
scale_score = log(total_outlets) / log(max_outlets_in_dataset)

SCI_final = SCI_embedded × (0.5 + 0.5 × scale_score)
```

## How It Works

### Example Dataset
- Brand A: 1 outlet
- Brand B: 10 outlets  
- Brand C: 100 outlets (max in dataset)

### Scale Score Calculation

**Brand A (1 outlet):**
```
scale_score = log(1) / log(100) = 0 / 4.605 = 0
multiplier = 0.5 + 0.5 × 0 = 0.5 (50%)
```

**Brand B (10 outlets):**
```
scale_score = log(10) / log(100) = 2.303 / 4.605 = 0.5
multiplier = 0.5 + 0.5 × 0.5 = 0.75 (75%)
```

**Brand C (100 outlets):**
```
scale_score = log(100) / log(100) = 4.605 / 4.605 = 1.0
multiplier = 0.5 + 0.5 × 1.0 = 1.0 (100%)
```

## Visual Representation

```
Outlets:    1      10      100
            |       |       |
Scale:      0      0.5     1.0
            |       |       |
Multiplier: 50%    75%    100%
```

## Why Logarithmic?

Logarithmic scaling provides:

1. **Diminishing Returns**: Going from 1→10 outlets has more impact than 90→100
2. **Fair Comparison**: Prevents very large brands from dominating unfairly
3. **Realistic Modeling**: Switching complexity doesn't grow linearly with outlets

## Impact on SCI

### Example: Same Product Adoption, Different Scales

Assume both brands have SCI_embedded = 0.4

**Brand with 1 outlet:**
```
SCI_final = 0.4 × 0.5 = 0.20 (Low)
```

**Brand with 10 outlets:**
```
SCI_final = 0.4 × 0.75 = 0.30 (Medium)
```

**Brand with 100 outlets:**
```
SCI_final = 0.4 × 1.0 = 0.40 (Medium)
```

## Key Takeaways

1. **Single-outlet brands** get 50% penalty - easier to switch one location
2. **Multi-outlet brands** get progressive bonus - harder to coordinate switching
3. **Maximum-outlet brands** get full score - highest switching complexity
4. **Logarithmic curve** ensures fair scaling across all sizes

## Business Implications

- **Low SCI + Few Outlets**: High churn risk, easy to lose
- **Low SCI + Many Outlets**: Opportunity for upselling
- **High SCI + Few Outlets**: Good adoption, but limited scale
- **High SCI + Many Outlets**: Most valuable, sticky customers
