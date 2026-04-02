import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Navigation } from './Navigation'
import { DataProvider } from '@/lib/data-context'
import { BrandWithKAM } from '@/lib/types'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Helper to render Navigation with DataProvider
function renderNavigation(brands: BrandWithKAM[] = []) {
  return render(
    <DataProvider>
      <Navigation />
    </DataProvider>
  )
}

describe('Navigation Component', () => {
  it('should render navigation links', () => {
    renderNavigation()

    // Check for Department Journey link
    const departmentLink = screen.getByText('Department Journey')
    expect(departmentLink).toBeDefined()
    expect(departmentLink.getAttribute('href')).toBe('/dashboard/key-accounts-department-journey')

    // Check for Brand Journeys dropdown button
    const brandJourneysButton = screen.getByText('Brand Journeys')
    expect(brandJourneysButton).toBeDefined()
  })

  it('should render logo/brand link', () => {
    renderNavigation()

    const logoLink = screen.getByText('Brand Journey Dashboard')
    expect(logoLink).toBeDefined()
    expect(logoLink.getAttribute('href')).toBe('/')
  })

  it('should open dropdown when Brand Journeys button is clicked', () => {
    renderNavigation()

    const brandJourneysButton = screen.getByText('Brand Journeys')
    
    // Dropdown should not be visible initially
    expect(screen.queryByPlaceholderText('Search brands...')).toBeNull()

    // Click to open dropdown
    fireEvent.click(brandJourneysButton)

    // Dropdown should now be visible
    const searchInput = screen.getByPlaceholderText('Search brands...')
    expect(searchInput).toBeDefined()
  })

  it('should close dropdown when clicking outside', () => {
    renderNavigation()

    const brandJourneysButton = screen.getByText('Brand Journeys')
    
    // Open dropdown
    fireEvent.click(brandJourneysButton)
    expect(screen.getByPlaceholderText('Search brands...')).toBeDefined()

    // Click overlay to close
    const overlay = document.querySelector('.fixed.inset-0')
    if (overlay) {
      fireEvent.click(overlay)
    }

    // Dropdown should be closed
    expect(screen.queryByPlaceholderText('Search brands...')).toBeNull()
  })
})
