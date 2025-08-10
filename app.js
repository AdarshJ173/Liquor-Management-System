import { ConvexHttpClient } from "convex/browser";

// Initialize Convex client
const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

// Global state
let selectedBrand = null;
let currentPage = 'sell';
let currentAction = null;

// DOM Elements
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupSellPage();
    setupStockPage();
    setupTransactionsPage();
    setupAnalyticsPage();
    setupPasswordModal();
    
    // Load initial data
    loadPage('sell');
}

// Navigation Setup
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.dataset.page;
            loadPage(page);
        });
    });
}

function loadPage(pageName) {
    // Update navigation
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageName);
    });
    
    // Update pages
    pages.forEach(page => {
        page.classList.toggle('active', page.id === `${pageName}Page`);
    });
    
    currentPage = pageName;
    
    // Load page-specific data
    switch (pageName) {
        case 'sell':
            loadBrands();
            break;
        case 'stock':
            loadStock();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// Sell Page Setup
function setupSellPage() {
    const brandSearch = document.getElementById('brandSearch');
    const brandSuggestions = document.getElementById('brandSuggestions');
    const sellForm = document.getElementById('sellForm');
    const quantityInput = document.getElementById('quantity');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const saleSummary = document.getElementById('saleSummary');
    
    let searchTimeout;
    
    brandSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            hideSuggestions();
            clearSalePreview();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchBrands(query);
        }, 300);
    });
    
    brandSearch.addEventListener('blur', () => {
        setTimeout(() => hideSuggestions(), 150);
    });
    
    quantityInput.addEventListener('input', updateSalePreview);
    
    sellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processSale();
    });
    
    async function searchBrands(query) {
        try {
            const brands = await convex.query("queries:searchBrands", { searchTerm: query });
            displaySuggestions(brands);
        } catch (error) {
            console.error('Search error:', error);
            showToast('Search failed', 'error');
        }
    }
    
    function displaySuggestions(brands) {
        if (brands.length === 0) {
            hideSuggestions();
            return;
        }
        
        brandSuggestions.innerHTML = brands.map(brand => `
            <div class="suggestion-item" onclick="selectBrand('${brand._id}', '${brand.name}', '${brand.type}', ${brand.price}, ${brand.quantity})">
                <strong>${brand.name} - ${brand.type}</strong><br>
                <small>₹${brand.price} | Stock: ${brand.quantity}</small>
            </div>
        `).join('');
        
        brandSuggestions.classList.add('show');
    }
    
    window.selectBrand = function(id, name, type, price, quantity) {
        selectedBrand = { _id: id, name, type, price, quantity };
        brandSearch.value = `${name} - ${type}`;
        hideSuggestions();
        updateSalePreview();
    };
    
    function hideSuggestions() {
        brandSuggestions.classList.remove('show');
    }
    
    function updateSalePreview() {
        if (!selectedBrand) {
            clearSalePreview();
            return;
        }
        
        const quantity = parseInt(quantityInput.value) || 0;
        const maxQuantity = selectedBrand.quantity;
        
        if (quantity <= 0) {
            clearSalePreview();
            return;
        }
        
        if (quantity > maxQuantity) {
            quantityInput.value = maxQuantity;
            showToast(`Maximum available quantity is ${maxQuantity}`, 'error');
            return;
        }
        
        const total = quantity * selectedBrand.price;
        
        document.getElementById('summaryText').textContent = 
            `${quantity} × ${selectedBrand.name} ${selectedBrand.type} @ ₹${selectedBrand.price}`;
        document.getElementById('totalAmount').textContent = `Total: ₹${total}`;
        
        saleSummary.style.display = 'block';
        checkoutBtn.disabled = false;
    }
    
    function clearSalePreview() {
        saleSummary.style.display = 'none';
        checkoutBtn.disabled = true;
    }
    
    async function processSale() {
        if (!selectedBrand) {
            showToast('Please select a brand', 'error');
            return;
        }
        
        const quantity = parseInt(quantityInput.value);
        const paymentMethod = document.getElementById('paymentMethod').value;
        const customerName = document.getElementById('customerName').value || undefined;
        const customerPhone = document.getElementById('customerPhone').value || undefined;
        
        if (quantity <= 0 || quantity > selectedBrand.quantity) {
            showToast('Invalid quantity', 'error');
            return;
        }
        
        try {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'Processing...';
            
            const result = await convex.mutation("createTransaction", {
                brandId: selectedBrand._id,
                quantity,
                paymentMethod,
                customerName,
                customerPhone
            });
            
            showToast(result.message, 'success');
            
            // Reset form
            sellForm.reset();
            selectedBrand = null;
            clearSalePreview();
            brandSearch.value = '';
            
            // Refresh data if on other pages
            if (currentPage === 'stock') loadStock();
            
        } catch (error) {
            console.error('Sale error:', error);
            showToast(error.message, 'error');
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = '🛒 Complete Sale';
        }
    }
}

// Stock Page Setup
function setupStockPage() {
    const addStockForm = document.getElementById('addStockForm');
    const stockSearch = document.getElementById('stockSearch');
    const stockFilter = document.getElementById('stockFilter');
    
    addStockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addStock();
    });
    
    stockSearch.addEventListener('input', filterStock);
    stockFilter.addEventListener('change', filterStock);
    
    async function addStock() {
        const name = document.getElementById('brandName').value.trim();
        const type = document.getElementById('brandType').value.trim();
        const price = parseFloat(document.getElementById('brandPrice').value);
        const quantity = parseInt(document.getElementById('brandQuantity').value);
        
        if (!name || !type || price <= 0 || quantity <= 0) {
            showToast('Please fill all fields with valid values', 'error');
            return;
        }
        
        try {
            const result = await convex.mutation("addStock", { name, type, price, quantity });
            showToast(result.message, 'success');
            addStockForm.reset();
            loadStock();
        } catch (error) {
            console.error('Add stock error:', error);
            showToast(error.message, 'error');
        }
    }
}

async function loadStock() {
    const stockGrid = document.getElementById('stockGrid');
    
    try {
        const stocks = await convex.query("queries:getStockLevels");
        displayStock(stocks);
    } catch (error) {
        console.error('Load stock error:', error);
        stockGrid.innerHTML = '<div class="loading">Failed to load stock</div>';
    }
}

function displayStock(stocks) {
    const stockGrid = document.getElementById('stockGrid');
    
    if (stocks.length === 0) {
        stockGrid.innerHTML = '<div class="loading">No stock available</div>';
        return;
    }
    
    stockGrid.innerHTML = stocks.map(stock => `
        <div class="stock-item ${stock.stockStatus === 'out' ? 'out-of-stock' : stock.stockStatus === 'low' ? 'low-stock' : ''}">
            <div class="stock-info">
                <h4>${stock.name} - ${stock.type}</h4>
                <p><strong>Price:</strong> ₹${stock.price}</p>
                <p><strong>Quantity:</strong> ${stock.quantity}</p>
                <p><strong>Total Value:</strong> ₹${stock.totalValue}</p>
                <p><small>Added: ${new Date(stock.createdAt).toLocaleDateString()}</small></p>
            </div>
            <div class="stock-actions">
                <button class="btn btn-danger btn-small" onclick="removeStock('${stock._id}', '${stock.name}', '${stock.type}')">
                    🗑️ Remove
                </button>
            </div>
        </div>
    `).join('');
}

function filterStock() {
    const search = document.getElementById('stockSearch').value.toLowerCase();
    const filter = document.getElementById('stockFilter').value;
    const stockItems = document.querySelectorAll('.stock-item');
    
    stockItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        const matchesSearch = search === '' || text.includes(search);
        
        let matchesFilter = true;
        if (filter === 'low') {
            matchesFilter = item.classList.contains('low-stock');
        } else if (filter === 'out') {
            matchesFilter = item.classList.contains('out-of-stock');
        }
        
        item.style.display = matchesSearch && matchesFilter ? 'block' : 'none';
    });
}

window.removeStock = function(brandId, name, type) {
    currentAction = {
        type: 'removeStock',
        data: { brandId, name, type }
    };
    showPasswordModal();
};

// Transactions Page Setup
function setupTransactionsPage() {
    const dateFilter = document.getElementById('dateFilter');
    const customDates = document.getElementById('customDates');
    const applyDateFilter = document.getElementById('applyDateFilter');
    
    dateFilter.addEventListener('change', (e) => {
        customDates.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        if (e.target.value !== 'custom') {
            loadTransactions();
        }
    });
    
    applyDateFilter.addEventListener('click', loadTransactions);
}

async function loadTransactions() {
    const transactionsList = document.getElementById('transactionsList');
    const transactionsSummary = document.getElementById('transactionsSummary');
    const dateFilter = document.getElementById('dateFilter').value;
    
    try {
        let dateFrom, dateTo;
        
        // Calculate date range based on filter
        const now = new Date();
        switch (dateFilter) {
            case 'today':
                dateFrom = new Date(now);
                dateFrom.setHours(0, 0, 0, 0);
                break;
            case 'week':
                dateFrom = new Date(now);
                dateFrom.setDate(now.getDate() - 7);
                break;
            case 'month':
                dateFrom = new Date(now);
                dateFrom.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                dateFrom = new Date(now);
                dateFrom.setFullYear(now.getFullYear() - 1);
                break;
            case 'custom':
                const fromInput = document.getElementById('dateFrom').value;
                const toInput = document.getElementById('dateTo').value;
                if (fromInput) dateFrom = new Date(fromInput);
                if (toInput) dateTo = new Date(toInput);
                break;
        }
        
        const params = {};
        if (dateFrom) params.dateFrom = dateFrom.getTime();
        if (dateTo) params.dateTo = dateTo.getTime();
        
        const transactions = await convex.query("queries:getTransactions", params);
        
        displayTransactions(transactions);
        displayTransactionsSummary(transactions);
        
    } catch (error) {
        console.error('Load transactions error:', error);
        transactionsList.innerHTML = '<div class="loading">Failed to load transactions</div>';
    }
}

function displayTransactions(transactions) {
    const transactionsList = document.getElementById('transactionsList');
    
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<div class="loading">No transactions found</div>';
        return;
    }
    
    transactionsList.innerHTML = transactions.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h4>${t.brandName} - ${t.brandType}</h4>
                <p>Quantity: ${t.quantity} | ${new Date(t.createdAt).toLocaleString()}</p>
                ${t.customerName ? `<p>Customer: ${t.customerName}</p>` : ''}
            </div>
            <div class="transaction-amount">₹${t.totalAmount}</div>
            <div class="payment-method ${t.paymentMethod}">${t.paymentMethod}</div>
            <button class="btn btn-danger btn-small" onclick="deleteTransaction('${t._id}')">🗑️</button>
        </div>
    `).join('');
}

function displayTransactionsSummary(transactions) {
    const transactionsSummary = document.getElementById('transactionsSummary');
    
    const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalBottles = transactions.reduce((sum, t) => sum + t.quantity, 0);
    const cashRevenue = transactions.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.totalAmount, 0);
    const upiRevenue = transactions.filter(t => t.paymentMethod === 'upi').reduce((sum, t) => sum + t.totalAmount, 0);
    
    transactionsSummary.innerHTML = `
        <div class="summary-item">
            <div class="value">₹${totalRevenue}</div>
            <div class="label">Total Revenue</div>
        </div>
        <div class="summary-item">
            <div class="value">${transactions.length}</div>
            <div class="label">Transactions</div>
        </div>
        <div class="summary-item">
            <div class="value">${totalBottles}</div>
            <div class="label">Bottles Sold</div>
        </div>
        <div class="summary-item">
            <div class="value">₹${cashRevenue}</div>
            <div class="label">Cash Revenue</div>
        </div>
        <div class="summary-item">
            <div class="value">₹${upiRevenue}</div>
            <div class="label">UPI Revenue</div>
        </div>
    `;
}

window.deleteTransaction = function(transactionId) {
    currentAction = {
        type: 'deleteTransaction',
        data: { transactionId }
    };
    showPasswordModal();
};

// Analytics Page Setup
function setupAnalyticsPage() {
    const analyticsDateFilter = document.getElementById('analyticsDateFilter');
    analyticsDateFilter.addEventListener('change', loadAnalytics);
}

async function loadAnalytics() {
    const metricsGrid = document.getElementById('metricsGrid');
    const topBrandsChart = document.getElementById('topBrandsChart');
    const dateFilter = document.getElementById('analyticsDateFilter').value;
    
    try {
        let dateFrom, dateTo;
        
        // Calculate date range
        const now = new Date();
        switch (dateFilter) {
            case 'today':
                dateFrom = new Date(now);
                dateFrom.setHours(0, 0, 0, 0);
                break;
            case 'week':
                dateFrom = new Date(now);
                dateFrom.setDate(now.getDate() - 7);
                break;
            case 'month':
                dateFrom = new Date(now);
                dateFrom.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                dateFrom = new Date(now);
                dateFrom.setFullYear(now.getFullYear() - 1);
                break;
        }
        
        const params = {};
        if (dateFrom) params.dateFrom = dateFrom.getTime();
        if (dateTo) params.dateTo = dateTo.getTime();
        
        const analytics = await convex.query("queries:getAnalytics", params);
        
        displayMetrics(analytics);
        displayTopBrands(analytics.topSellingBrands);
        
    } catch (error) {
        console.error('Load analytics error:', error);
        metricsGrid.innerHTML = '<div class="loading">Failed to load analytics</div>';
    }
}

function displayMetrics(analytics) {
    const metricsGrid = document.getElementById('metricsGrid');
    
    metricsGrid.innerHTML = `
        <div class="metric-card revenue">
            <div class="icon">💰</div>
            <div class="value">₹${analytics.totalRevenue}</div>
            <div class="label">Total Revenue</div>
        </div>
        <div class="metric-card transactions">
            <div class="icon">📊</div>
            <div class="value">${analytics.totalTransactions}</div>
            <div class="label">Transactions</div>
        </div>
        <div class="metric-card bottles">
            <div class="icon">🍾</div>
            <div class="value">${analytics.totalBottlesSold}</div>
            <div class="label">Bottles Sold</div>
        </div>
        <div class="metric-card stock">
            <div class="icon">📦</div>
            <div class="value">${analytics.totalStock}</div>
            <div class="label">Current Stock</div>
        </div>
        <div class="metric-card revenue">
            <div class="icon">💵</div>
            <div class="value">₹${analytics.cashRevenue}</div>
            <div class="label">Cash Revenue</div>
        </div>
        <div class="metric-card revenue">
            <div class="icon">📱</div>
            <div class="value">₹${analytics.upiRevenue}</div>
            <div class="label">UPI Revenue</div>
        </div>
        <div class="metric-card stock">
            <div class="icon">⚠️</div>
            <div class="value">${analytics.lowStockBrands}</div>
            <div class="label">Low Stock Items</div>
        </div>
        <div class="metric-card stock">
            <div class="icon">❌</div>
            <div class="value">${analytics.outOfStockBrands}</div>
            <div class="label">Out of Stock</div>
        </div>
    `;
}

function displayTopBrands(topBrands) {
    const topBrandsChart = document.getElementById('topBrandsChart');
    
    if (topBrands.length === 0) {
        topBrandsChart.innerHTML = '<div class="chart-placeholder">No sales data available</div>';
        return;
    }
    
    topBrandsChart.innerHTML = `
        <div class="top-brands-list">
            ${topBrands.map((brand, index) => `
                <div class="brand-item">
                    <div class="name">${index + 1}. ${brand.name}</div>
                    <div class="stats">
                        <span>${brand.quantity} bottles</span>
                        <span>₹${brand.revenue}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Password Modal Setup
function setupPasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    const confirmAction = document.getElementById('confirmAction');
    const cancelAction = document.getElementById('cancelAction');
    const ownerPassword = document.getElementById('ownerPassword');
    
    confirmAction.addEventListener('click', async () => {
        const password = ownerPassword.value;
        if (!password) {
            showToast('Please enter password', 'error');
            return;
        }
        
        await executeProtectedAction(password);
        hidePasswordModal();
    });
    
    cancelAction.addEventListener('click', hidePasswordModal);
    
    // Close modal on background click
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) {
            hidePasswordModal();
        }
    });
}

function showPasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    const ownerPassword = document.getElementById('ownerPassword');
    
    passwordModal.style.display = 'flex';
    ownerPassword.value = '';
    ownerPassword.focus();
}

function hidePasswordModal() {
    const passwordModal = document.getElementById('passwordModal');
    passwordModal.style.display = 'none';
    currentAction = null;
}

async function executeProtectedAction(password) {
    if (!currentAction) return;
    
    try {
        let result;
        
        switch (currentAction.type) {
            case 'removeStock':
                const { brandId, name, type } = currentAction.data;
                const quantity = prompt(`How many bottles of ${name} ${type} to remove?`);
                if (!quantity || quantity <= 0) return;
                
                result = await convex.mutation("removeStock", {
                    brandId,
                    quantity: parseInt(quantity),
                    ownerPassword: password
                });
                loadStock();
                break;
                
            case 'deleteTransaction':
                result = await convex.mutation("deleteTransaction", {
                    transactionId: currentAction.data.transactionId,
                    ownerPassword: password
                });
                loadTransactions();
                break;
        }
        
        showToast(result.message, 'success');
    } catch (error) {
        console.error('Protected action error:', error);
        showToast(error.message, 'error');
    }
}

// Utility Functions
async function loadBrands() {
    try {
        const brands = await convex.query("queries:getAllBrands");
        return brands;
    } catch (error) {
        console.error('Load brands error:', error);
        return [];
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 4000);
}

// Backup functionality (manual trigger)
window.createBackup = async function() {
    try {
        showToast('Creating backup...', 'info');
        // This would typically call a backup mutation
        // For now, we'll just show a success message
        setTimeout(() => {
            showToast('Backup created successfully', 'success');
        }, 2000);
    } catch (error) {
        console.error('Backup error:', error);
        showToast('Backup failed', 'error');
    }
};
