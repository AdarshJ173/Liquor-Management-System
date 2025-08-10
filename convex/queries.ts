import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all brands for stock management and selling page
export const getAllBrands = query({
  handler: async ({ db }) => {
    return await db.query("brands").order("desc", "updatedAt").collect();
  },
});

// Search brands by name or type
export const searchBrands = query({
  args: { searchTerm: v.string() },
  handler: async ({ db }, { searchTerm }) => {
    const allBrands = await db.query("brands").collect();
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return allBrands.filter(brand => 
      brand.name.toLowerCase().includes(lowerSearchTerm) ||
      brand.type.toLowerCase().includes(lowerSearchTerm)
    ).slice(0, 10); // Limit to 10 results for performance
  },
});

// Get all transactions with optional date filtering
export const getTransactions = query({
  args: {
    limit: v.optional(v.number()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async ({ db }, { limit = 50, dateFrom, dateTo }) => {
    let query = db.query("transactions");
    
    if (dateFrom || dateTo) {
      query = query.withIndex("by_date");
      if (dateFrom && dateTo) {
        query = query.filter(q => q.and(
          q.gte(q.field("createdAt"), dateFrom),
          q.lte(q.field("createdAt"), dateTo)
        ));
      } else if (dateFrom) {
        query = query.filter(q => q.gte(q.field("createdAt"), dateFrom));
      } else if (dateTo) {
        query = query.filter(q => q.lte(q.field("createdAt"), dateTo));
      }
    }
    
    return await query.order("desc", "createdAt").take(limit);
  },
});

// Get today's transactions
export const getTodaysTransactions = query({
  handler: async ({ db }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    
    return await db
      .query("transactions")
      .withIndex("by_date", q => q.gte("createdAt", startOfDay))
      .order("desc", "createdAt")
      .collect();
  },
});

// Get analytics data
export const getAnalytics = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async ({ db }, { dateFrom, dateTo }) => {
    // Get transactions in date range
    let transactionsQuery = db.query("transactions");
    
    if (dateFrom || dateTo) {
      transactionsQuery = transactionsQuery.withIndex("by_date");
      if (dateFrom && dateTo) {
        transactionsQuery = transactionsQuery.filter(q => q.and(
          q.gte(q.field("createdAt"), dateFrom),
          q.lte(q.field("createdAt"), dateTo)
        ));
      } else if (dateFrom) {
        transactionsQuery = transactionsQuery.filter(q => q.gte(q.field("createdAt"), dateFrom));
      } else if (dateTo) {
        transactionsQuery = transactionsQuery.filter(q => q.lte(q.field("createdAt"), dateTo));
      }
    }
    
    const transactions = await transactionsQuery.collect();
    const brands = await db.query("brands").collect();

    // Calculate totals
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalTransactions = transactions.length;
    const totalBottlesSold = transactions.reduce((sum, t) => sum + t.quantity, 0);
    
    // Revenue by payment method
    const cashRevenue = transactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.totalAmount, 0);
    const upiRevenue = transactions
      .filter(t => t.paymentMethod === 'upi')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // Stock analysis
    const totalBrands = brands.length;
    const totalStock = brands.reduce((sum, b) => sum + b.quantity, 0);
    const outOfStockBrands = brands.filter(b => b.quantity === 0).length;
    const lowStockBrands = brands.filter(b => b.quantity > 0 && b.quantity <= 5).length;

    // Top selling brands
    const brandSales = new Map();
    transactions.forEach(t => {
      const key = `${t.brandName} ${t.brandType}`;
      const existing = brandSales.get(key) || { quantity: 0, revenue: 0, brandId: t.brandId };
      brandSales.set(key, {
        ...existing,
        quantity: existing.quantity + t.quantity,
        revenue: existing.revenue + t.totalAmount,
      });
    });

    const topSellingBrands = Array.from(brandSales.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalRevenue,
      totalTransactions,
      totalBottlesSold,
      cashRevenue,
      upiRevenue,
      totalBrands,
      totalStock,
      outOfStockBrands,
      lowStockBrands,
      topSellingBrands,
    };
  },
});

// Get stock levels
export const getStockLevels = query({
  handler: async ({ db }) => {
    const brands = await db.query("brands").order("asc", "name").collect();
    
    return brands.map(brand => ({
      ...brand,
      stockStatus: brand.quantity === 0 ? 'out' : brand.quantity <= 5 ? 'low' : 'good',
      totalValue: brand.quantity * brand.price,
    }));
  },
});
