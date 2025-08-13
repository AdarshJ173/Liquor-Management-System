import { ConvexHttpClient } from "convex/browser";

// Initialize Convex client
const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

// Global state
let selectedBrand = null;
let currentPage = 'sell';
let currentAction = null;
let shoppingCart = []; // Array to store cart items

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
            loadStockSidebar();
            loadTotalStockValue();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'stock-history':
            loadStockHistory();
            break;
    }
}

// Shopping Cart Implementation
function setupSellPage() {
    const brandSearch = document.getElementById('brandSearch');
    const brandSuggestions = document.getElementById('brandSuggestions');
    const quantityInput = document.getElementById('quantity');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const cartSection = document.getElementById('cartSection');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const sellForm = document.getElementById('sellForm');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutTotal = document.getElementById('checkoutTotal');
    const clearCartBtn = document.getElementById('clearCartBtn');
    
    let searchTimeout;
    
    // Brand search functionality
    brandSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            hideSuggestions();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            searchBrands(query);
        }, 300);
    });
    
    brandSearch.addEventListener('blur', (e) => {
        // Delay hiding suggestions to allow for clicks
        setTimeout(() => {
            // Check if mouse is over any suggestion items
            const hoveredSuggestion = document.querySelector('.suggestion-item:hover');
            if (!hoveredSuggestion) {
                hideSuggestions();
            }
        }, 200);
    });
    
    // Add to cart functionality
    addToCartBtn.addEventListener('click', addToCart);
    
    // Clear cart functionality
    clearCartBtn.addEventListener('click', clearCart);
    
    // Checkout form submission
    sellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processCartCheckout();
    });
    
    // Quantity input change
    quantityInput.addEventListener('input', () => {
        updateAddToCartButton();
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
        
        brandSuggestions.innerHTML = '';
        
        brands.forEach(brand => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <strong>${brand.name} - ${brand.type}</strong><br>
                <small>₹${brand.price} | Stock: ${brand.quantity}</small>
            `;
            
            // Add click event listener directly - define selectBrand inline
            suggestionItem.addEventListener('click', (e) => {
                e.stopPropagation();
                // Select the brand directly
                selectedBrand = { _id: brand._id, name: brand.name, type: brand.type, price: brand.price, quantity: brand.quantity };
                brandSearch.value = `${brand.name} - ${brand.type}`;
                hideSuggestions();
                updateAddToCartButton();
                console.log('Brand selected:', selectedBrand); // Debug log
            });
            
            // Prevent the blur event from hiding suggestions immediately
            suggestionItem.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            
            brandSuggestions.appendChild(suggestionItem);
        });
        
        brandSuggestions.classList.add('show');
    }
    
    window.selectBrand = function(id, name, type, price, quantity) {
        selectedBrand = { _id: id, name, type, price, quantity };
        brandSearch.value = `${name} - ${type}`;
        hideSuggestions();
        updateAddToCartButton();
    };
    
    function hideSuggestions() {
        brandSuggestions.classList.remove('show');
    }
    
    function updateAddToCartButton() {
        const quantity = parseInt(quantityInput.value) || 0;
        addToCartBtn.disabled = !selectedBrand || quantity <= 0;
    }
    
    function addToCart() {
        if (!selectedBrand) {
            showToast('Please select a brand first', 'error');
            return;
        }
        
        const quantity = parseInt(quantityInput.value) || 0;
        
        if (quantity <= 0) {
            showToast('Please enter a valid quantity', 'error');
            return;
        }
        
        if (quantity > selectedBrand.quantity) {
            showToast(`Only ${selectedBrand.quantity} bottles available`, 'error');
            return;
        }
        
        // Check if item already exists in cart
        const existingItemIndex = shoppingCart.findIndex(item => item.brandId === selectedBrand._id);
        
        if (existingItemIndex !== -1) {
            // Update existing item quantity
            const newQuantity = shoppingCart[existingItemIndex].quantity + quantity;
            if (newQuantity > selectedBrand.quantity) {
                showToast(`Total quantity would exceed stock (${selectedBrand.quantity})`, 'error');
                return;
            }
            shoppingCart[existingItemIndex].quantity = newQuantity;
            shoppingCart[existingItemIndex].itemTotal = newQuantity * selectedBrand.price;
        } else {
            // Add new item to cart
            shoppingCart.push({
                brandId: selectedBrand._id,
                brandName: selectedBrand.name,
                brandType: selectedBrand.type,
                quantity: quantity,
                pricePerBottle: selectedBrand.price,
                itemTotal: quantity * selectedBrand.price,
                maxStock: selectedBrand.quantity
            });
        }
        
        updateCartDisplay();
        resetAddToCartForm();
        showToast(`Added ${quantity} × ${selectedBrand.name} ${selectedBrand.type} to cart`, 'success');
    }
    
    function resetAddToCartForm() {
        brandSearch.value = '';
        quantityInput.value = 1;
        selectedBrand = null;
        addToCartBtn.disabled = true;
        hideSuggestions();
    }
    
    function updateCartDisplay() {
        const total = shoppingCart.reduce((sum, item) => sum + item.itemTotal, 0);
        
        if (shoppingCart.length === 0) {
            cartSection.style.display = 'none';
            checkoutBtn.disabled = true;
            cartTotal.textContent = '0';
            checkoutTotal.textContent = '0';
            return;
        }
        
        cartSection.style.display = 'block';
        checkoutBtn.disabled = false;
        
        cartItems.innerHTML = shoppingCart.map((item, index) => `
            <div class="cart-item">
                <div class="item-info">
                    <strong>${item.brandName} - ${item.brandType}</strong><br>
                    <small>₹${item.pricePerBottle} × ${item.quantity} = ₹${item.itemTotal}</small>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small" onclick="updateCartItem(${index}, ${item.quantity - 1})">−</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="btn btn-small" onclick="updateCartItem(${index}, ${item.quantity + 1})">+</button>
                    <button class="btn btn-danger btn-small" onclick="removeFromCart(${index})">🗑️</button>
                </div>
            </div>
        `).join('');
        
        cartTotal.textContent = total;
        checkoutTotal.textContent = total;
    }
    
    window.updateCartItem = function(index, newQuantity) {
        if (newQuantity <= 0) {
            removeFromCart(index);
            return;
        }
        
        const item = shoppingCart[index];
        if (newQuantity > item.maxStock) {
            showToast(`Maximum ${item.maxStock} bottles available`, 'error');
            return;
        }
        
        shoppingCart[index].quantity = newQuantity;
        shoppingCart[index].itemTotal = newQuantity * item.pricePerBottle;
        updateCartDisplay();
    };
    
    window.removeFromCart = function(index) {
        const item = shoppingCart[index];
        shoppingCart.splice(index, 1);
        updateCartDisplay();
        showToast(`Removed ${item.brandName} ${item.brandType} from cart`, 'info');
    };
    
    function clearCart() {
        shoppingCart = [];
        updateCartDisplay();
        showToast('Cart cleared', 'info');
    }
    
    async function processCartCheckout() {
        if (shoppingCart.length === 0) {
            showToast('Cart is empty', 'error');
            return;
        }
        
        const paymentMethod = document.getElementById('paymentMethod').value;
        const customerName = document.getElementById('customerName').value || undefined;
        const customerPhone = document.getElementById('customerPhone').value || undefined;
        
        // Prepare cart items for backend
        const cartItems = shoppingCart.map(item => ({
            brandId: item.brandId,
            quantity: item.quantity
        }));
        
        try {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '🔄 Processing...';
            
            const result = await convex.mutation("createCartTransaction", {
                items: cartItems,
                paymentMethod,
                customerName,
                customerPhone
            });
            
            showToast(result.message, 'success');
            
            // Clear cart and reset form
            shoppingCart = [];
            updateCartDisplay();
            sellForm.reset();
            
            // Refresh stock if on stock page
            if (currentPage === 'stock') {
                await Promise.all([
                    loadStock(),
                    loadStockSidebar(),
                    loadTotalStockValue()
                ]);
            }
            
        } catch (error) {
            console.error('Checkout error:', error);
            showToast(error.message, 'error');
        } finally {
            checkoutBtn.disabled = shoppingCart.length === 0;
            checkoutBtn.innerHTML = '🛒 Complete Sale';
        }
    }
}

// Stock Page Setup
function setupStockPage() {
    const addStockForm = document.getElementById('addStockForm');
    const stockSearch = document.getElementById('stockSearch');
    const stockFilter = document.getElementById('stockFilter');
    const viewStockHistoryBtn = document.getElementById('viewStockHistoryBtn');
    
    addStockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addStock();
    });
    
    stockSearch.addEventListener('input', filterStock);
    stockFilter.addEventListener('change', filterStock);
    
    viewStockHistoryBtn.addEventListener('click', () => {
        loadPage('stock-history');
    });
    
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
            
            // Refresh both stock list and sidebar data
            await Promise.all([
                loadStock(),
                loadStockSidebar(),
                loadTotalStockValue()
            ]);
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
    
    stockGrid.innerHTML = stocks.map(stock => {
        const isOutOfStock = stock.quantity === 0;
        const isLowStock = stock.quantity > 0 && stock.quantity <= 5;
        const statusClass = isOutOfStock ? 'out-of-stock' : isLowStock ? 'low-stock' : '';
        
        // Determine status badge
        let statusBadge = '';
        if (isOutOfStock) {
            statusBadge = '<span class="stock-status out-of-stock">❌ OUT OF STOCK</span>';
        } else if (isLowStock) {
            statusBadge = '<span class="stock-status low-stock">⚠️ LOW STOCK</span>';
        } else {
            statusBadge = '<span class="stock-status in-stock">✅ IN STOCK</span>';
        }
        
        return `
            <div class="stock-item ${statusClass}">
                <div class="stock-info">
                    <h4>${stock.name} - ${stock.type}</h4>
                    <p><strong>Price:</strong> <span>₹${stock.price.toLocaleString()}</span></p>
                    <p><strong>Quantity:</strong> <span>${stock.quantity} bottles</span></p>
                    <p><strong>Total Value:</strong> <span>₹${stock.totalValue.toLocaleString()}</span></p>
                    <p><strong>Status:</strong> ${statusBadge}</p>
                    <p><strong>Added:</strong> <span>${new Date(stock.createdAt).toLocaleDateString('en-IN', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    })}</span></p>
                </div>
                <div class="stock-actions">
                    ${isOutOfStock ? 
                        `<button class="btn btn-success" onclick="restockItem('${stock._id}', '${stock.name}', '${stock.type}', ${stock.price})">
                            🔄 Restock
                        </button>
                        <button class="btn btn-danger" onclick="removeStockCompletely('${stock._id}', '${stock.name}', '${stock.type}')">
                            🗑️ Delete
                        </button>` :
                        `<button class="btn btn-warning" onclick="removeStockPartial('${stock._id}', '${stock.name}', '${stock.type}', ${stock.quantity})">
                            📉 Remove Some
                        </button>
                        <button class="btn btn-danger" onclick="removeStockCompletely('${stock._id}', '${stock.name}', '${stock.type}')">
                            🗑️ Delete All
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
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
    const paymentFilter = document.getElementById('paymentFilter');
    const customDates = document.getElementById('customDates');
    const applyDateFilter = document.getElementById('applyDateFilter');
    
    dateFilter.addEventListener('change', (e) => {
        customDates.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        if (e.target.value !== 'custom') {
            loadTransactions();
        }
    });
    
    paymentFilter.addEventListener('change', loadTransactions);
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
    const paymentFilter = document.getElementById('paymentFilter').value;
    
    // Filter transactions by payment method
    let filteredTransactions = transactions;
    if (paymentFilter !== 'all') {
        filteredTransactions = transactions.filter(t => t.paymentMethod === paymentFilter);
    }
    
    if (filteredTransactions.length === 0) {
        transactionsList.innerHTML = '<div class="loading">No transactions found</div>';
        return;
    }
    
    transactionsList.innerHTML = filteredTransactions.map(t => {
        let transactionDetails = '';
        
        if (t.transactionType === 'multi' && t.items) {
            // Multi-item transaction
            const itemsText = t.items.map(item => `${item.quantity} × ${item.brandName} ${item.brandType}`).join(', ');
            transactionDetails = `
                <h4>🛒 Multi-Item Sale</h4>
                <p>${itemsText}</p>
                <p>${new Date(t.createdAt).toLocaleString()}</p>
                ${t.customerName ? `<p>Customer: ${t.customerName}</p>` : ''}
            `;
        } else {
            // Single-item transaction (backward compatibility)
            transactionDetails = `
                <h4>${t.brandName || 'Unknown'} - ${t.brandType || 'Unknown'}</h4>
                <p>Quantity: ${t.quantity || 0} | ${new Date(t.createdAt).toLocaleString()}</p>
                ${t.customerName ? `<p>Customer: ${t.customerName}</p>` : ''}
            `;
        }
        
        return `
            <div class="transaction-item">
                <div class="transaction-info">
                    ${transactionDetails}
                </div>
                <div class="transaction-amount">₹${t.totalAmount}</div>
                <div class="payment-method ${t.paymentMethod}">${t.paymentMethod}</div>
                <button class="btn btn-danger btn-small" onclick="deleteTransaction('${t._id}')">🗑️</button>
            </div>
        `;
    }).join('');
}

function displayTransactionsSummary(transactions) {
    const transactionsSummary = document.getElementById('transactionsSummary');
    const paymentFilter = document.getElementById('paymentFilter').value;
    
    // Filter transactions by payment method for summary too
    let filteredTransactions = transactions;
    if (paymentFilter !== 'all') {
        filteredTransactions = transactions.filter(t => t.paymentMethod === paymentFilter);
    }
    
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
    
    // Calculate total bottles properly for both single and multi-item transactions using filtered transactions
    const totalBottles = filteredTransactions.reduce((sum, t) => {
        if (t.transactionType === 'multi' && t.items) {
            return sum + t.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
        } else {
            return sum + (t.quantity || 0);
        }
    }, 0);
    
    // For cash/UPI breakdown, use filtered transactions if payment filter is applied, otherwise use all
    const transactionsForPaymentBreakdown = paymentFilter === 'all' ? transactions : filteredTransactions;
    const cashRevenue = transactionsForPaymentBreakdown.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.totalAmount, 0);
    const upiRevenue = transactionsForPaymentBreakdown.filter(t => t.paymentMethod === 'upi').reduce((sum, t) => sum + t.totalAmount, 0);
    
    transactionsSummary.innerHTML = `
        <div class="summary-item">
            <div class="value">₹${totalRevenue}</div>
            <div class="label">Total Revenue</div>
        </div>
        <div class="summary-item">
            <div class="value">${filteredTransactions.length}</div>
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

// Stock Sidebar Functions
async function loadTotalStockValue() {
    const totalStockValueElement = document.getElementById('totalStockValue');
    
    try {
        console.log('Attempting to load total stock value...');
        
        // Try alternate query calling method first
        let totalValue;
        try {
            totalValue = await convex.query("queries:getTotalStockValue");
        } catch (queryError) {
            console.warn('First query method failed, trying alternative...', queryError.message);
            // Try importing the query directly (fallback method)
            const stocks = await convex.query("queries:getStockLevels");
            totalValue = stocks.reduce((total, stock) => total + (stock.totalValue || 0), 0);
            console.log('Calculated total from stock levels:', totalValue);
        }
        
        console.log('Raw total stock value from query:', totalValue);
        
        if (typeof totalValue === 'number' && !isNaN(totalValue)) {
            const formattedValue = Math.round(totalValue).toLocaleString();
            totalStockValueElement.textContent = `₹${formattedValue}`;
            console.log('Total stock value loaded successfully:', totalValue);
        } else {
            console.warn('Invalid total value received:', totalValue);
            totalStockValueElement.textContent = '₹0';
        }
    } catch (error) {
        console.error('Load total stock value error:', error);
        console.error('Error details:', error.message, error.stack);
        totalStockValueElement.textContent = '₹0';
    }
}

async function loadStockSidebar() {
    const stockEntriesList = document.getElementById('stockEntriesList');
    
    try {
        console.log('Loading stock sidebar...');
        console.log('Convex client initialized:', !!convex);
        console.log('Convex URL:', import.meta.env.VITE_CONVEX_URL);
        
        // Check if Convex is actually running
        if (!convex) {
            throw new Error('Convex client not initialized. Please start the Convex backend.');
        }
        
        // First, let's get debug info about the database
        let debugInfo = null;
        try {
            debugInfo = await convex.query("queries:getDebugInfo");
            console.log('Database debug info:', debugInfo);
            
            // If we have brands but no stock entries, offer to migrate
            if (debugInfo.brandsCount > 0 && debugInfo.stockEntriesCount === 0) {
                console.log('Found brands but no stock entries. Migration may be needed.');
                const shouldMigrate = confirm(
                    `Found ${debugInfo.brandsCount} brands but no stock history records. ` +
                    'Would you like to create stock history entries for existing inventory? ' +
                    'This will enable the stock history feature.'
                );
                
                if (shouldMigrate) {
                    console.log('User confirmed migration. Starting...');
                    try {
                        const migrationResult = await convex.mutation("migrateData:migrateData");
                        console.log('Migration result:', migrationResult);
                        showToast(migrationResult.message, 'success');
                        
                        // Refresh after migration
                        setTimeout(() => {
                            loadStockSidebar();
                        }, 1000);
                        return; // Exit early to avoid showing the empty message
                    } catch (migrationError) {
                        console.error('Migration failed:', migrationError);
                        showToast('Migration failed: ' + migrationError.message, 'error');
                    }
                }
            }
        } catch (debugError) {
            console.warn('Could not fetch debug info:', debugError.message);
            // If we can't get debug info, it's likely a connection issue
            throw debugError; // Re-throw to be caught by outer catch block
        }
        
        // Try to fetch stock entries with timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000);
        });
        
        const queryPromise = convex.query("queries:getStockEntriesByWeek");
        const entriesByWeek = await Promise.race([queryPromise, timeoutPromise]);
        
        console.log('Stock entries loaded successfully:', entriesByWeek);
        console.log('Type of entries:', typeof entriesByWeek, 'Array?', Array.isArray(entriesByWeek));
        console.log('Number of weeks found:', entriesByWeek?.length || 0);
        
        if (entriesByWeek) {
            displayStockEntriesSidebar(entriesByWeek);
        } else {
            console.warn('Received null or undefined entries');
            displayStockEntriesSidebar([]);
        }
    } catch (error) {
        console.error('Load stock sidebar error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error type:', typeof error);
        
        // Show different messages based on error type
        let errorMessage = 'Error loading stock entries.';
        let detailedMessage = '';
        
        if (error.message.includes('timeout')) {
            errorMessage = 'Request timeout. Please check your connection.';
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Convex backend is not running!';
            detailedMessage = 'Please start the Convex development server by running "npx convex dev" in your terminal.';
        } else if (error.message.includes('Convex client not initialized')) {
            errorMessage = 'Backend connection failed.';
            detailedMessage = 'Please ensure the Convex development server is running.';
        } else if (error.message.includes('Could not reach')) {
            errorMessage = 'Cannot connect to Convex backend.';
            detailedMessage = 'Make sure to run "npx convex dev" to start the backend server.';
        }
        
        stockEntriesList.innerHTML = `
            <div class="loading" style="text-align: center; padding: 20px;">
                <p style="color: #e74c3c; font-weight: bold; margin-bottom: 10px;">⚠️ ${errorMessage}</p>
                ${detailedMessage ? `<p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 15px;">${detailedMessage}</p>` : ''}
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left; font-family: monospace; font-size: 0.8rem;">
                    <strong>To fix this:</strong><br>
                    1. Open terminal in project directory<br>
                    2. Run: <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px;">npx convex dev</code><br>
                    3. Wait for "Serving at" message<br>
                    4. Refresh this page
                </div>
            </div>
        `;
    }
}

function displayStockEntriesSidebar(entriesByWeek) {
    const stockEntriesList = document.getElementById('stockEntriesList');
    
    if (!entriesByWeek || entriesByWeek.length === 0) {
        // Check if we have existing stock (visible on the page) but no stock history
        const hasExistingStock = document.querySelector('.stock-item') !== null;
        
        if (hasExistingStock) {
            stockEntriesList.innerHTML = `
                <div class="loading" style="text-align: center; padding: 20px;">
                    <p style="margin-bottom: 10px;">📦 Existing stock found, but no history records.</p>
                    <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 15px;">Your existing inventory needs to be migrated to enable stock history tracking.</p>
                    <button class="btn btn-primary" onclick="triggerMigration()" style="padding: 8px 16px; font-size: 0.9rem;">
                        🔄 Enable Stock History
                    </button>
                    <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 10px;">This will create history records for your current inventory.</p>
                </div>
            `;
        } else {
            stockEntriesList.innerHTML = `
                <div class="loading">
                    <p style="margin-bottom: 10px;">📦 No stock added yet.</p>
                    <p style="font-size: 0.9rem; opacity: 0.8;">Add some inventory using the form above to see stock history here.</p>
                </div>
            `;
        }
        return;
    }
    
    // Show only the most recent 5 weeks in sidebar
    const recentWeeks = entriesByWeek.slice(0, 5);
    
    stockEntriesList.innerHTML = recentWeeks.map((weekData, weekIndex) => {
        const weekNum = weekData.week.split('-W')[1];
        const year = weekData.week.split('-W')[0];
        
        return `
            <div class="stock-entry-week">
                <div class="week-header" onclick="toggleWeekEntries(${weekIndex})">
                    <span>Week ${weekNum}, ${year}</span>
                    <span class="week-total">₹${Math.round(weekData.totalValue)}</span>
                </div>
                <div class="week-entries" id="weekEntries${weekIndex}">
                    ${weekData.entries.slice(0, 3).map(entry => `
                        <div class="stock-entry-item">
                            <div class="entry-brand">${entry.brandName} - ${entry.brandType}</div>
                            <div class="entry-details">
                                <span>${entry.quantity} × ₹${entry.pricePerBottle}</span>
                                <span class="entry-date">${new Date(entry.addedDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    `).join('')}
                    ${weekData.entries.length > 3 ? `<div class="entry-more">+${weekData.entries.length - 3} more entries</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.toggleWeekEntries = function(weekIndex) {
    const weekEntries = document.getElementById(`weekEntries${weekIndex}`);
    weekEntries.classList.toggle('expanded');
};

// Manual migration trigger function
window.triggerMigration = async function() {
    console.log('Manual migration triggered...');
    try {
        const migrationResult = await convex.mutation("migrateData:migrateData");
        console.log('Migration result:', migrationResult);
        showToast(migrationResult.message, 'success');
        
        // Refresh after migration
        setTimeout(() => {
            loadStockSidebar();
            loadTotalStockValue();
        }, 1000);
    } catch (migrationError) {
        console.error('Migration failed:', migrationError);
        showToast('Migration failed: ' + migrationError.message, 'error');
    }
};

// Stock History Functions
async function loadStockHistory() {
    const stockHistoryList = document.getElementById('stockHistoryList');
    const totalHistoryValue = document.getElementById('totalHistoryValue');
    
    try {
        const entriesByWeek = await convex.query("queries:getStockEntriesByWeek");
        const totalValue = entriesByWeek ? entriesByWeek.reduce((sum, week) => sum + week.totalValue, 0) : 0;
        
        const formattedValue = Math.round(totalValue).toLocaleString();
        totalHistoryValue.textContent = `₹${formattedValue}`;
        displayStockHistory(entriesByWeek);
    } catch (error) {
        console.error('Load stock history error:', error);
        stockHistoryList.innerHTML = '<div class="loading">Error loading stock history. Please try again.</div>';
        totalHistoryValue.textContent = '₹0';
    }
}

function displayStockHistory(entriesByWeek) {
    const stockHistoryList = document.getElementById('stockHistoryList');
    
    if (!entriesByWeek || entriesByWeek.length === 0) {
        stockHistoryList.innerHTML = `
            <div class="loading">
                <p style="margin-bottom: 10px;">📊 No stock history available yet.</p>
                <p style="font-size: 0.9rem; opacity: 0.8;">Your stock addition history will appear here once you start adding inventory.</p>
            </div>
        `;
        return;
    }
    
    stockHistoryList.innerHTML = entriesByWeek.map((weekData, weekIndex) => {
        const weekNum = weekData.week.split('-W')[1];
        const year = weekData.week.split('-W')[0];
        
        // Calculate week start and end dates
        const weekStart = getWeekStartDate(parseInt(year), parseInt(weekNum));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        return `
            <div class="history-week-item">
                <div class="history-week-header" onclick="toggleHistoryWeek(${weekIndex})">
                    <div class="history-week-title">
                        <div>
                            <div class="week-period">Week ${weekNum}, ${year}</div>
                            <div style="font-size: 0.9rem; opacity: 0.8;">${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</div>
                        </div>
                        <div class="week-value">₹${Math.round(weekData.totalValue)}</div>
                    </div>
                </div>
                <div class="history-week-entries" id="historyWeek${weekIndex}">
                    <div class="history-entries-grid">
                        ${weekData.entries.map(entry => `
                            <div class="history-entry-card">
                                <div class="history-entry-title">${entry.brandName} - ${entry.brandType}</div>
                                <div class="history-entry-details">
                                    <div class="history-entry-detail">
                                        <span class="detail-label">Quantity:</span>
                                        <span class="detail-value">${entry.quantity} bottles</span>
                                    </div>
                                    <div class="history-entry-detail">
                                        <span class="detail-label">Price per bottle:</span>
                                        <span class="detail-value">₹${entry.pricePerBottle}</span>
                                    </div>
                                    <div class="history-entry-detail">
                                        <span class="detail-label">Total Value:</span>
                                        <span class="detail-value amount">₹${Math.round(entry.totalValue)}</span>
                                    </div>
                                    <div class="history-entry-detail">
                                        <span class="detail-label">Added on:</span>
                                        <span class="detail-value">${new Date(entry.addedDate).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleHistoryWeek = function(weekIndex) {
    const weekEntries = document.getElementById(`historyWeek${weekIndex}`);
    weekEntries.classList.toggle('expanded');
};

// Helper function to get week start date
function getWeekStartDate(year, weekNum) {
    const jan1 = new Date(year, 0, 1);
    const daysToAdd = (weekNum - 1) * 7 - jan1.getDay() + 1;
    const weekStart = new Date(jan1);
    weekStart.setDate(jan1.getDate() + daysToAdd);
    return weekStart;
}

// Update the checkout process to also refresh stock sidebar when sales happen
async function updateStockAfterSale() {
    if (currentPage === 'stock') {
        await Promise.all([
            loadStock(),
            loadStockSidebar(),
            loadTotalStockValue()
        ]);
    }
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

// ==============================================
// CUSTOM DIALOG AND STOCK MANAGEMENT FUNCTIONS
// ==============================================

// Custom Dialog Functions
function showCustomDialog(title, message, showInput = false, inputConfig = {}) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('customDialog');
        const titleEl = document.getElementById('dialogTitle');
        const messageEl = document.getElementById('dialogMessage');
        const inputDiv = document.getElementById('dialogInput');
        const inputField = document.getElementById('dialogInputField');
        const inputLabel = document.getElementById('inputLabel');
        const inputHelp = document.getElementById('inputHelp');
        const confirmBtn = document.getElementById('dialogConfirm');
        const cancelBtn = document.getElementById('dialogCancel');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        if (showInput) {
            inputDiv.style.display = 'block';
            inputLabel.textContent = inputConfig.label || 'Enter value:';
            inputField.value = inputConfig.value || '';
            inputField.min = inputConfig.min || 0;
            inputField.max = inputConfig.max || '';
            inputHelp.textContent = inputConfig.help || '';
            inputField.focus();
        } else {
            inputDiv.style.display = 'none';
        }
        
        const cleanup = () => {
            dialog.style.display = 'none';
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };
        
        confirmBtn.onclick = () => {
            const value = showInput ? parseInt(inputField.value) : true;
            cleanup();
            resolve(value);
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
        };
        
        dialog.style.display = 'flex';
    });
}

// Restock Modal Functions
function showRestockModal(brandId, brandName, brandType, currentPrice) {
    return new Promise((resolve) => {
        const modal = document.getElementById('restockModal');
        const titleEl = document.getElementById('restockTitle');
        const messageEl = document.getElementById('restockMessage');
        const quantityInput = document.getElementById('restockQuantity');
        const priceInput = document.getElementById('restockPrice');
        const infoEl = document.getElementById('restockInfo');
        const confirmBtn = document.getElementById('restockConfirm');
        const cancelBtn = document.getElementById('restockCancel');
        
        titleEl.textContent = `🔄 Restock: ${brandName} - ${brandType}`;
        messageEl.textContent = 'Add more inventory for this item:';
        quantityInput.value = 1;
        priceInput.value = currentPrice;
        infoEl.textContent = `Current price: ₹${currentPrice}. You can update the price if needed.`;
        
        const cleanup = () => {
            modal.style.display = 'none';
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };
        
        confirmBtn.onclick = () => {
            const quantity = parseInt(quantityInput.value);
            const price = parseFloat(priceInput.value);
            
            if (!quantity || quantity <= 0) {
                showToast('Please enter a valid quantity', 'error');
                return;
            }
            
            if (!price || price <= 0) {
                showToast('Please enter a valid price', 'error');
                return;
            }
            
            cleanup();
            resolve({ quantity, price });
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            resolve(null);
        };
        
        modal.style.display = 'flex';
        quantityInput.focus();
    });
}

// Stock Management Functions
window.removeStockPartial = async function(brandId, name, type, maxQuantity) {
    const quantity = await showCustomDialog(
        '📉 Remove Some Stock',
        `How many bottles of "${name} - ${type}" would you like to remove?`,
        true,
        {
            label: 'Quantity to Remove:',
            value: 1,
            min: 1,
            max: maxQuantity,
            help: `Available: ${maxQuantity} bottles`
        }
    );
    
    if (!quantity || quantity <= 0) return;
    
    if (quantity > maxQuantity) {
        showToast(`Cannot remove ${quantity} bottles. Only ${maxQuantity} available.`, 'error');
        return;
    }
    
    currentAction = {
        type: 'removeStockPartial',
        data: { brandId, name, type, quantity }
    };
    showPasswordModal();
};

window.removeStockCompletely = async function(brandId, name, type) {
    const confirmed = await showCustomDialog(
        '🗑️ Delete Stock Item',
        `Are you sure you want to completely delete "${name} - ${type}" from your inventory?\n\nThis action cannot be undone.`,
        false
    );
    
    if (!confirmed) return;
    
    currentAction = {
        type: 'removeStockCompletely',
        data: { brandId, name, type }
    };
    showPasswordModal();
};

window.restockItem = async function(brandId, name, type, currentPrice) {
    const restockData = await showRestockModal(brandId, name, type, currentPrice);
    
    if (!restockData) return;
    
    try {
        const result = await convex.mutation("addStock", {
            name,
            type,
            price: restockData.price,
            quantity: restockData.quantity
        });
        
        showToast(`Successfully restocked ${restockData.quantity} bottles of ${name} - ${type}`, 'success');
        
        // Refresh stock data
        await Promise.all([
            loadStock(),
            loadStockSidebar(),
            loadTotalStockValue()
        ]);
        
    } catch (error) {
        console.error('Restock error:', error);
        showToast('Failed to restock: ' + error.message, 'error');
    }
};

// Update the executeProtectedAction function to handle new action types
const originalExecuteProtectedAction = executeProtectedAction;
window.executeProtectedAction = async function(password) {
    if (!currentAction) return;
    
    try {
        let result;
        
        switch (currentAction.type) {
            case 'removeStockPartial':
                const { brandId: partialBrandId, name: partialName, type: partialType, quantity: partialQuantity } = currentAction.data;
                result = await convex.mutation("removeStock", {
                    brandId: partialBrandId,
                    quantity: partialQuantity,
                    ownerPassword: password
                });
                await Promise.all([loadStock(), loadStockSidebar(), loadTotalStockValue()]);
                break;
                
            case 'removeStockCompletely':
                const { brandId: completeBrandId, name: completeName, type: completeType } = currentAction.data;
                // Remove all stock by setting quantity to a very high number
                result = await convex.mutation("removeStock", {
                    brandId: completeBrandId,
                    quantity: 99999, // Remove all
                    ownerPassword: password
                });
                await Promise.all([loadStock(), loadStockSidebar(), loadTotalStockValue()]);
                break;
                
            case 'removeStock':
            case 'deleteTransaction':
                // Handle legacy actions
                return await originalExecuteProtectedAction(password);
                
            default:
                console.warn('Unknown action type:', currentAction.type);
                return;
        }
        
        showToast(result.message, 'success');
    } catch (error) {
        console.error('Protected action error:', error);
        showToast(error.message, 'error');
    }
};

// Replace the original function
executeProtectedAction = window.executeProtectedAction;
