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
    brandId: v.id("brands"),     // reference to brands table
    brandName: v.string(),       // denormalized for easier queries
    brandType: v.string(),       // denormalized for easier queries
    quantity: v.number(),        // bottles sold
    pricePerBottle: v.number(),  // price at time of sale
    totalAmount: v.number(),
    paymentMethod: v.string(),   // 'cash' or 'upi'
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_date", ["createdAt"])
    .index("by_payment_method", ["paymentMethod"])
    .index("by_brand", ["brandId"]),

  backups: defineTable({
    path: v.string(),
    createdAt: v.number(),
    size: v.optional(v.number()),
    status: v.string(), // 'success' | 'failed'
  })
    .index("by_date", ["createdAt"]),
});
