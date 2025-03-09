/**
 * Determines the current skill type based on the URL path
 * @param {string} pathname - The current URL path
 * @returns {string} - 'sales', 'product', or 'softskills' (default)
 */
export const determineSkillType = (pathname) => {
    if (pathname.includes('/sales/')) return 'sales';
    if (pathname.includes('/product/')) return 'product';
    return 'softskills'; // Default
  };