import { mutation } from "./_generated/server";

// Helper function to get week of year in YYYY-WXX format
function getWeekOfYear(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export const migrateData = mutation({
  handler: async ({ db }) => {
    console.log('Starting data migration...');
    
    // Get all existing brands
    const brands = await db.query("brands").collect();
    console.log('Found existing brands:', brands.length);
    
    // Get existing stock entries to avoid duplicates
    const existingStockEntries = await db.query("stockEntries").collect();
    console.log('Found existing stock entries:', existingStockEntries.length);
    
    let created = 0;
    const now = Date.now();
    const currentDate = new Date(now);
    const weekOfYear = getWeekOfYear(currentDate);
    
    for (const brand of brands) {
      // Check if we already have stock entries for this brand
      const existingForBrand = existingStockEntries.find(entry => entry.brandId === brand._id);
      
      if (!existingForBrand && brand.quantity > 0) {
        // Create a stock entry for this existing brand
        console.log('Creating stock entry for existing brand:', brand.name, brand.type);
        
        await db.insert("stockEntries", {
          brandId: brand._id,
          brandName: brand.name,
          brandType: brand.type,
          quantity: brand.quantity,
          pricePerBottle: brand.price,
          totalValue: brand.quantity * brand.price,
          addedDate: brand.createdAt || now, // Use brand's creation date if available
          weekOfYear,
          createdAt: now,
        });
        
        created++;
      }
    }
    
    console.log('Migration completed. Created stock entries:', created);
    
    return {
      success: true,
      message: `Migration completed successfully. Created ${created} stock entries for existing brands.`,
      brandsProcessed: brands.length,
      stockEntriesCreated: created,
      existingStockEntries: existingStockEntries.length
    };
  },
});
