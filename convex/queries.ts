import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all stock entries, grouped by week
export const getStockEntriesByWeek = query({
  handler: async ({ db }) => {
    console.log('Fetching stock entries from database...');
    const entries = await db.query("stockEntries").order("desc", "createdAt").collect();
    console.log('Raw stock entries found:', entries.length, entries);
    
    if (entries.length === 0) {
      console.log('No stock entries found in database');
      return [];
    }
    
    // Group entries by week
    const groupedByWeek = entries.reduce((acc, entry) => {
      const { weekOfYear } = entry;
      if (!acc[weekOfYear]) {
        acc[weekOfYear] = {
          week: weekOfYear,
          totalValue: 0,
          entries: [],
        };
      }
      acc[weekOfYear].entries.push(entry);
      acc[weekOfYear].totalValue += entry.totalValue;
      return acc;
    }, {} as Record<string, { week: string, totalValue: number, entries: typeof entries }>);

    const result = Object.values(groupedByWeek).sort((a, b) => b.week.localeCompare(a.week));
    console.log('Grouped stock entries by week:', result);
    return result;
  },
});

// Get total stock value
export const getTotalStockValue = query({
  handler: async ({ db }) => {
    const allStock = await db.query("brands").collect();
    return allStock.reduce((total, brand) => total + (brand.price * brand.quantity), 0);
  },
});

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
    
    // Calculate total bottles sold (handle both single and multi-item transactions)
    const totalBottlesSold = transactions.reduce((sum, t) => {
      if (t.transactionType === 'multi' && t.items) {
        return sum + t.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
      } else {
        return sum + (t.quantity || 0);
      }
    }, 0);
    
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

    // Top selling brands (handle both single and multi-item transactions)
    const brandSales = new Map();
    transactions.forEach(t => {
      if (t.transactionType === 'multi' && t.items) {
        // Handle multi-item transactions
        t.items.forEach(item => {
          const key = `${item.brandName} ${item.brandType}`;
          const existing = brandSales.get(key) || { quantity: 0, revenue: 0, brandId: item.brandId };
          brandSales.set(key, {
            ...existing,
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.itemTotal,
          });
        });
      } else {
        // Handle single-item transactions
        const key = `${t.brandName} ${t.brandType}`;
        const existing = brandSales.get(key) || { quantity: 0, revenue: 0, brandId: t.brandId };
        brandSales.set(key, {
          ...existing,
          quantity: existing.quantity + (t.quantity || 0),
          revenue: existing.revenue + t.totalAmount,
        });
      }
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

// Debug query to check database state
export const getDebugInfo = query({
  handler: async ({ db }) => {
    const brands = await db.query("brands").collect();
    const stockEntries = await db.query("stockEntries").collect();
    const transactions = await db.query("transactions").collect();
    
    console.log('DEBUG INFO:');
    console.log('Brands count:', brands.length);
    console.log('Stock entries count:', stockEntries.length);
    console.log('Transactions count:', transactions.length);
    console.log('Sample brands:', brands.slice(0, 3));
    console.log('Sample stock entries:', stockEntries.slice(0, 3));
    
    return {
      brandsCount: brands.length,
      stockEntriesCount: stockEntries.length,
      transactionsCount: transactions.length,
      sampleBrands: brands.slice(0, 3),
      sampleStockEntries: stockEntries.slice(0, 3),
      sampleTransactions: transactions.slice(0, 3)
    };
  },
});
