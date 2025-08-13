import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  brands: defineTable({
    name: v.string(),            // e.g. "Johnnie Walker"
    type: v.string(),            // e.g. "Black Label 750ml"
    price: v.number(),           // price per bottle
    quantity: v.number(),        // current in-store quantity
    createdAt: v.number(),       // timestamp when stock batch added
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_type", ["type"])
    .index("by_name_type", ["name", "type"]),

  transactions: defineTable({
    // For single-item backward compatibility
    brandId: v.optional(v.id("brands")),
    brandName: v.optional(v.string()),
    brandType: v.optional(v.string()),
    quantity: v.optional(v.number()),
    pricePerBottle: v.optional(v.number()),
    
    // Multi-item cart support
    items: v.optional(v.array(v.object({
      brandId: v.id("brands"),
      brandName: v.string(),
      brandType: v.string(),
      quantity: v.number(),
      pricePerBottle: v.number(),
      itemTotal: v.number(),
    }))),
    
    // Common fields
    totalAmount: v.number(),
    paymentMethod: v.string(),   // 'cash' or 'upi'
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    createdAt: v.number(),
    transactionType: v.optional(v.string()), // 'single' or 'multi'
  })
    .index("by_date", ["createdAt"])
    .index("by_payment_method", ["paymentMethod"])
    .index("by_brand", ["brandId"]),

  // New table for tracking individual stock entries
  stockEntries: defineTable({
    brandId: v.id("brands"),
    brandName: v.string(),          // denormalized for easier queries
    brandType: v.string(),          // denormalized for easier queries
    quantity: v.number(),           // quantity added in this entry
    pricePerBottle: v.number(),     // price at time of adding
    totalValue: v.number(),         // quantity * price
    addedDate: v.number(),          // timestamp when stock was added
    weekOfYear: v.string(),         // "2025-W32" format for week grouping
    createdAt: v.number(),
  })
    .index("by_date", ["createdAt"])
    .index("by_brand", ["brandId"])
    .index("by_week", ["weekOfYear"])
    .index("by_brand_date", ["brandId", "addedDate"]),

  backups: defineTable({
    path: v.string(),
    createdAt: v.number(),
    size: v.optional(v.number()),
    status: v.string(), // 'success' | 'failed'
  })
    .index("by_date", ["createdAt"]),
});
