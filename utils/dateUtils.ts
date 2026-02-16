/**
 * Safely formats a date string to locale date string
 * @param dateString - The date string to format
 * @param fallback - The fallback text if date is invalid (default: 'Not set')
 * @returns Formatted date string or fallback text
 */
export function formatDateSafely(dateString: string | null | undefined, fallback: string = 'Not set'): string {
  if (!dateString || dateString.trim() === '') {
    return fallback;
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return date.toLocaleDateString();
  } catch (error) {
    return fallback;
  }
}

/**
 * Safely formats a date string to locale date and time string
 * @param dateString - The date string to format
 * @param fallback - The fallback text if date is invalid (default: 'Not set')
 * @returns Formatted date and time string or fallback text
 */
export function formatDateTimeSafely(dateString: string | null | undefined, fallback: string = 'Not set'): string {
  if (!dateString || dateString.trim() === '') {
    return fallback;
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return date.toLocaleString();
  } catch (error) {
    return fallback;
  }
}

/**
 * Checks if a date string is valid
 * @param dateString - The date string to validate
 * @returns True if the date is valid, false otherwise
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  if (!dateString || dateString.trim() === '') {
    return false;
  }
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}

/**
 * Calculates the duration between two dates in a human-readable format
 * @param startDate - The start date string
 * @param endDate - The end date string
 * @returns Human-readable duration string or fallback text
 */
export function calculateDuration(startDate: string | null | undefined, endDate: string | null | undefined): string {
  if (!startDate || !endDate || startDate.trim() === '' || endDate.trim() === '') {
    return 'N/A';
  }
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'N/A';
    }
    
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`;
    } else {
      return 'Same time';
    }
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Converts various date formats to DD-MMM-YYYY format
 * Handles: DD-MM-YYYY, DD-MMM-YY, DD-MMM-YYYY, and other formats
 * @param dateString - The date string in various formats
 * @param fallback - The fallback text if date is invalid (default: 'Invalid Date')
 * @returns Formatted date string in DD-MMM-YYYY format or fallback text
 */
export function formatDDMMYYYYToMMMFormat(dateString: string | null | undefined, fallback: string = 'Invalid Date'): string {
  if (!dateString || dateString.trim() === '') {
    return fallback;
  }

  try {
    const cleanDate = dateString.trim();
    
    // Handle DD-MMM-YY format (e.g., "26-Jan-26")
    const ddMmmYyPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/;
    const ddMmmYyMatch = cleanDate.match(ddMmmYyPattern);
    if (ddMmmYyMatch) {
      const [, day, monthAbbr, year] = ddMmmYyMatch;
      // Convert 2-digit year to 4-digit (assuming 20xx)
      const fullYear = `20${year}`;
      return `${day.padStart(2, '0')}-${monthAbbr}-${fullYear}`;
    }
    
    // Handle DD-MMM-YYYY format (e.g., "26-Jan-2026") - already correct
    const ddMmmYyyyPattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/;
    const ddMmmYyyyMatch = cleanDate.match(ddMmmYyyyPattern);
    if (ddMmmYyyyMatch) {
      const [, day, monthAbbr, year] = ddMmmYyyyMatch;
      return `${day.padStart(2, '0')}-${monthAbbr}-${year}`;
    }
    
    // Handle DD-MM-YYYY format (e.g., "26-01-2026")
    const ddMmYyyyPattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const ddMmYyyyMatch = cleanDate.match(ddMmYyyyPattern);
    if (ddMmYyyyMatch) {
      const [, day, month, year] = ddMmYyyyMatch;
      
      // Validate parts
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum) || 
          dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
        return fallback;
      }
      
      // Create date object to validate and get month name
      const isoFormat = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const date = new Date(isoFormat);
      
      if (isNaN(date.getTime())) {
        return fallback;
      }
      
      // Get month abbreviation
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      const monthAbbr = monthNames[date.getMonth()];
      
      // Return formatted date as DD-MMM-YYYY
      return `${day.padStart(2, '0')}-${monthAbbr}-${year}`;
    }
    
    // If not in expected formats, try to parse as regular date and format
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const monthAbbr = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day}-${monthAbbr}-${year}`;
    }
    
    return fallback;
  } catch (error) {
    console.error('Error formatting date:', error);
    return fallback;
  }
}