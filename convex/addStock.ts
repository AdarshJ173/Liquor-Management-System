import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
  args: {
    name: v.string(),
    type: v.string(),
    price: v.number(),
    quantity: v.number(),
  },
  handler: async ({ db }, { name, type, price, quantity }) => {
    const now = Date.now();
    
    // Check if brand with same name and type already exists
    const existing = await db
      .query("brands")
      .withIndex("by_name_type", (q) => q.eq("name", name).eq("type", type))
      .first();

    if (existing) {
      // Update existing brand - add to quantity and update price
      await db.patch(existing._id, {
        quantity: existing.quantity + quantity,
        price, // Update price to latest
        updatedAt: now,
      });
      return { 
        success: true, 
        message: `Updated ${name} ${type}. New quantity: ${existing.quantity + quantity}`,
        brandId: existing._id
      };
    } else {
      // Create new brand entry
      const brandId = await db.insert("brands", {
        name,
        type,
        price,
        quantity,
        createdAt: now,
        updatedAt: now,
      });
      return { 
        success: true, 
        message: `Added new brand: ${name} ${type} with ${quantity} bottles`,
        brandId
      };
    }
  },
});
