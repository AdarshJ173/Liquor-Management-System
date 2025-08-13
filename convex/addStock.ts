import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to get week of year in YYYY-WXX format
function getWeekOfYear(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default mutation({
  args: {
    name: v.string(),
    type: v.string(),
    price: v.number(),
    quantity: v.number(),
  },
  handler: async ({ db }, { name, type, price, quantity }) => {
    const now = Date.now();
    const currentDate = new Date(now);
    const weekOfYear = getWeekOfYear(currentDate);
    const totalValue = quantity * price;
    
    // Check if brand with same name and type already exists
    const existing = await db
      .query("brands")
      .withIndex("by_name_type", (q) => q.eq("name", name).eq("type", type))
      .first();

    let brandId: string;
    let isNewBrand = false;

    if (existing) {
      // Update existing brand - add to quantity and update price
      await db.patch(existing._id, {
        quantity: existing.quantity + quantity,
        price, // Update price to latest
        updatedAt: now,
      });
      brandId = existing._id;
    } else {
      // Create new brand entry
      brandId = await db.insert("brands", {
        name,
        type,
        price,
        quantity,
        createdAt: now,
        updatedAt: now,
      });
      isNewBrand = true;
    }

    // Always record this stock entry for tracking
    console.log('Creating stock entry record:', {
      brandId,
      brandName: name,
      brandType: type,
      quantity,
      pricePerBottle: price,
      totalValue,
      addedDate: now,
      weekOfYear,
      createdAt: now,
    });
    
    const stockEntryId = await db.insert("stockEntries", {
      brandId,
      brandName: name,
      brandType: type,
      quantity,
      pricePerBottle: price,
      totalValue,
      addedDate: now,
      weekOfYear,
      createdAt: now,
    });
    
    console.log('Stock entry created successfully with ID:', stockEntryId);

    const newTotalQuantity = existing ? existing.quantity + quantity : quantity;
    const message = isNewBrand 
      ? `Added new brand: ${name} ${type} with ${quantity} bottles`
      : `Updated ${name} ${type}. New quantity: ${newTotalQuantity}`;

    return { 
      success: true, 
      message,
      brandId,
      stockEntryRecorded: true,
      totalValue
    };
  },
});
