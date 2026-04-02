import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import fc from 'fast-check'
import { Milestone } from './Milestone'
import { Milestone as MilestoneType, DepartmentMetrics, BrandMetrics } from '@/lib/types'

// Arbitraries for property-based testing
const revenueBreakdownArbitrary = () =>
  fc.record({
    products: fc.float({ min: 0, max: 100000, noNaN: true }),
    services: fc.float({ min: 0, max: 100000, noNaN: true }),
    bundlePlans: fc.float({ min: 0, max: 100000, noNaN: true }),
  }).map(({ products, services, bundlePlans }) => ({
    products,
    services,
    bundlePlans,
    total: products + services + bundlePlans,
  }))

const departmentMetricsArbitrary = () =>
  fc.record({
    brandCount: fc.integer({ min: 0, max: 1000 }),
    outletCount: fc.integer({ min: 0, max: 5000 }),
    revenue: revenueBreakdownArbitrary(),
    isProjected: fc.boolean(),
  })

const brandMetricsArbitrary = () =>
  fc.record({
    outletCount: fc.integer({ min: 0, max: 100 }),
    revenue: revenueBreakdownArbitrary(),
    isProjected: fc.boolean(),
  })

const milestoneArbitrary = () =>
  fc.oneof(
    fc.record({
      date: fc.date({ min: new Date(2025, 3, 1), max: new Date(2027, 2, 31) }),
      label: fc.string({ minLength: 0, maxLength: 50 }),
      metrics: departmentMetricsArbitrary(),
      isProjected: fc.boolean(),
    }),
    fc.record({
      date: fc.date({ min: new Date(2025, 3, 1), max: new Date(2027, 2, 31) }),
      label: fc.string({ minLength: 0, maxLength: 50 }),
      metrics: brandMetricsArbitrary(),
      isProjected: fc.boolean(),
    })
  )

// Feature: brand-journey-dashboard, Property 12: Milestone data completeness
describe('Milestone Component - Property Tests', () => {
  test('Property 12: Milestone data completeness - all milestones display brand/outlet count and revenue breakdown', () => {
    fc.assert(
      fc.property(milestoneArbitrary(), (milestone) => {
        const { container, unmount } = render(
          <Milestone milestone={milestone} isProjected={milestone.isProjected} />
        )

        // Check that outlet count is displayed
        expect(container.textContent).toContain('Outlet Count')
        expect(container.textContent).toContain(milestone.metrics.outletCount.toString())

        // Check that revenue breakdown fields are displayed
        expect(container.textContent).toContain('New:')
        expect(container.textContent).toContain('Renewal:')
        expect(container.textContent).toContain('Total:')

        // Check that revenue values are displayed
        const revenue = milestone.metrics.revenue
        expect(container.textContent).toContain(revenue.new.toLocaleString())
        expect(container.textContent).toContain(revenue.renewal.toLocaleString())
        expect(container.textContent).toContain(revenue.total.toLocaleString())

        // If it's department metrics, check brand count is displayed
        if ('brandCount' in milestone.metrics) {
          expect(container.textContent).toContain('Brand Count')
          expect(container.textContent).toContain(milestone.metrics.brandCount.toString())
        }

        // Clean up after each property test iteration
        unmount()
      }),
      { numRuns: 100 }
    )
  })

  // Feature: brand-journey-dashboard, Property 13: Realized vs projected styling
  test('Property 13: Realized vs projected styling - projected milestones have distinct styling from realized milestones', () => {
    fc.assert(
      fc.property(milestoneArbitrary(), fc.boolean(), (milestone, isProjected) => {
        const { container, unmount } = render(
          <Milestone milestone={milestone} isProjected={isProjected} />
        )

        const milestoneElement = container.firstChild as HTMLElement

        if (isProjected) {
          // Projected milestones should have dashed border and lighter background
          expect(milestoneElement.className).toContain('border-dashed')
          expect(milestoneElement.className).toContain('border-gray-300')
          expect(milestoneElement.className).toContain('bg-gray-50')
          
          // Should display "(Projected)" text
          expect(container.textContent).toContain('(Projected)')
        } else {
          // Realized milestones should have solid border and white background
          expect(milestoneElement.className).toContain('border-gray-600')
          expect(milestoneElement.className).toContain('bg-white')
          expect(milestoneElement.className).not.toContain('border-dashed')
          
          // Should NOT display "(Projected)" text
          expect(container.textContent).not.toContain('(Projected)')
        }

        // Clean up after each property test iteration
        unmount()
      }),
      { numRuns: 100 }
    )
  })

  // Feature: brand-journey-dashboard, Property 18: Projected data labeling
  test('Property 18: Projected data labeling - projected milestones include text indicating estimate/projection', () => {
    fc.assert(
      fc.property(milestoneArbitrary(), (milestone) => {
        const { container, unmount } = render(
          <Milestone milestone={milestone} isProjected={true} />
        )

        // When isProjected is true, the rendered output should include text indicating it's a projection
        const projectionIndicators = ['Projected', 'projected', 'estimate', 'Estimate', 'projection', 'Projection']
        const hasProjectionLabel = projectionIndicators.some(indicator => 
          container.textContent?.includes(indicator)
        )

        expect(hasProjectionLabel).toBe(true)

        // Clean up after each property test iteration
        unmount()
      }),
      { numRuns: 100 }
    )
  })

  // Feature: brand-journey-dashboard, Property 17: Interactive element handlers
  test('Property 17: Interactive element handlers - milestones have attached event handlers for user interactions', () => {
    fc.assert(
      fc.property(milestoneArbitrary(), (milestone) => {
        let clickHandlerCalled = false
        const handleClick = () => {
          clickHandlerCalled = true
        }

        const { container, unmount } = render(
          <Milestone 
            milestone={milestone} 
            isProjected={milestone.isProjected}
            onClick={handleClick}
          />
        )

        const milestoneElement = container.firstChild as HTMLElement

        // Verify click handler is attached and works
        expect(milestoneElement).toBeTruthy()
        milestoneElement.click()
        expect(clickHandlerCalled).toBe(true)

        // Verify hover handlers are attached (check for onMouseEnter/onMouseLeave)
        // The element should have cursor-pointer class indicating it's interactive
        expect(milestoneElement.className).toContain('cursor-pointer')

        // Clean up after each property test iteration
        unmount()
      }),
      { numRuns: 100 }
    )
  })
})
