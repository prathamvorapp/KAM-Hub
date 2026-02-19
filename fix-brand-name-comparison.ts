// Quick Fix: Make brand name comparison case-insensitive and trim whitespace
// File: lib/services/healthCheckService.ts
// Replace the filter logic in getBrandsForAssessment function

// BEFORE (line ~440):
/*
const brandsForAssessment = allBrands?.filter(brand => 
  !assessedBrandNames.has(brand.brand_name)
) || [];
*/

// AFTER:
const brandsForAssessment = allBrands?.filter(brand => {
  // Normalize the brand name: trim whitespace and convert to lowercase
  const normalizedBrandName = brand.brand_name?.trim().toLowerCase();
  
  // Check if this normalized name exists in the assessed brands set
  // We need to normalize the assessed names too for comparison
  const isAssessed = Array.from(assessedBrandNames).some(
    assessedName => assessedName?.trim().toLowerCase() === normalizedBrandName
  );
  
  return !isAssessed;
}) || [];

// EXPLANATION:
// This fix handles:
// 1. Case sensitivity: "Cafe Levista" vs "CAFE LEVISTA"
// 2. Whitespace: "Cafe Levista" vs "Cafe Levista "
// 3. Null/undefined values: Safely handles missing brand names

// ALTERNATIVE FIX (if you want to keep it simple):
/*
const assessedBrandNamesNormalized = new Set(
  assessedChecks?.map(c => c.brand_name?.trim().toLowerCase()) || []
);

const brandsForAssessment = allBrands?.filter(brand => 
  !assessedBrandNamesNormalized.has(brand.brand_name?.trim().toLowerCase())
) || [];
*/
