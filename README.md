# Liquor Management System

A modern, mobile-first liquor store management system built with HTML, CSS, JavaScript, and Convex database. This system helps liquor store owners manage inventory, process sales, track transactions, and analyze business performance.

## Features

### 🛒 Point of Sale (POS)
- **Smart Brand Search**: Type-ahead search for quick product selection
- **Real-time Stock Validation**: Prevents overselling with automatic stock checks
- **Multiple Payment Methods**: Cash and UPI/QR payment tracking
- **Customer Information**: Optional customer name and phone recording
- **Sale Preview**: Live calculation of totals before checkout

### 📦 Stock Management
- **Add Stock**: Easily add new brands or restock existing items
- **Smart Updates**: Automatically merges stock for existing brand-type combinations
- **Stock Filtering**: Filter by stock status (All, Low Stock ≤5, Out of Stock)
- **Search Functionality**: Quick search across all stock items
- **Visual Indicators**: Color-coded cards for low stock and out-of-stock items
- **Protected Operations**: Password-protected stock removal

### 📊 Transaction History
- **Comprehensive Tracking**: All sales with timestamps and details
- **Flexible Filtering**: View by today, week, month, year, or custom date range
- **Summary Statistics**: Revenue breakdown by payment method
- **Transaction Management**: Delete transactions with owner password protection
- **Customer Records**: Track customer information when provided

### 📈 Analytics Dashboard
- **Revenue Analytics**: Total revenue with cash/UPI breakdown
- **Stock Analytics**: Current inventory levels and alerts
- **Performance Metrics**: Transaction count and bottles sold
- **Top Sellers**: Identify best-performing brands and products
- **Date Filtering**: Analyze performance over different time periods

### 🔒 Security Features
- **Owner Authentication**: Password protection for sensitive operations
- **Secure Deletions**: Protected stock removal and transaction deletion
- **Environment Variables**: Secure password storage via environment variables

### 📱 Mobile-First Design
- **Responsive Layout**: Works perfectly on all screen sizes
- **Touch-Friendly**: Optimized for mobile and tablet use
- **Fast Loading**: Minimal dependencies for quick startup
- **Offline-Ready**: Local data caching for reliability

## Technology Stack

- **Frontend**: Pure HTML5, CSS3, and ES6+ JavaScript
- **Database**: Convex (modern, real-time database)
- **Build Tool**: Vite for fast development and building
- **Styling**: Custom CSS with mobile-first responsive design
- **Fonts**: Inter font family for modern typography

## Prerequisites

- Node.js (v16+ recommended)
- npm (comes with Node.js)
- Git (for version control)
- A Convex account (free tier available)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/muneeswarreddy740-cpu/Liquor-Management-System.git
cd Liquor-Management-System
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Convex Database

#### Login to Convex
```bash
npx convex login
```

#### Initialize Convex Development
```bash
npx convex dev
```

This will:
- Create a new Convex project
- Deploy your schema and functions
- Generate the client configuration
- Start the development server

### 4. Set Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Convex Configuration
VITE_CONVEX_URL=your_convex_deployment_url_here

# Owner Password (set this to a secure password)
CONVEX_OWNER_PASSWORD=your_secure_password_here
```

**Important**: Replace `your_secure_password_here` with a strong password. This will be used for protected operations like stock removal and transaction deletion.

### 5. Deploy to Convex

For production deployment:

```bash
npx convex deploy
```

### 6. Start Development Server

```bash
npm run dev
```

The application will open in your browser at `http://localhost:5173`

## Usage Guide

### Initial Setup

1. **Add Your First Stock Items**:
   - Go to the Stock page
   - Fill in brand name (e.g., "Johnnie Walker")
   - Add type/size (e.g., "Black Label 750ml")
   - Set price per bottle
   - Add initial quantity

2. **Set Owner Password**:
   - Ensure your `CONVEX_OWNER_PASSWORD` environment variable is set
   - This password protects sensitive operations

### Daily Operations

1. **Making Sales**:
   - Use the Sell page (default page)
   - Type to search for brands
   - Select quantity and payment method
   - Add customer details (optional)
   - Complete the sale

2. **Managing Stock**:
   - View current stock levels on the Stock page
   - Add new stock as needed
   - Remove expired or damaged stock (requires password)

3. **Reviewing Performance**:
   - Check the Analytics page for business insights
   - Review transaction history for detailed records
   - Monitor stock levels and reorder alerts

## Database Schema

### Brands Table
- **name**: Brand name (e.g., "Johnnie Walker")
- **type**: Product type/size (e.g., "Black Label 750ml")
- **price**: Price per bottle
- **quantity**: Current stock quantity
- **createdAt/updatedAt**: Timestamps

### Transactions Table
- **brandId**: Reference to brands table
- **brandName/brandType**: Denormalized for easier queries
- **quantity**: Number of bottles sold
- **pricePerBottle**: Price at time of sale
- **totalAmount**: Total transaction value
- **paymentMethod**: "cash" or "upi"
- **customerName/customerPhone**: Optional customer info
- **createdAt**: Transaction timestamp

### Backups Table
- **path**: Backup file path
- **createdAt**: Backup timestamp
- **size**: Backup file size
- **status**: Backup status

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run convex:dev` - Start Convex development
- `npm run convex:deploy` - Deploy to Convex

### Project Structure

```
Liquor-Management-System/
├── convex/                 # Convex backend functions
│   ├── schema.ts          # Database schema
│   ├── addStock.ts        # Add stock mutation
│   ├── removeStock.ts     # Remove stock mutation
│   ├── createTransaction.ts # Create transaction mutation
│   ├── deleteTransaction.ts # Delete transaction mutation
│   └── queries.ts         # Database queries
├── public/                # Static assets (if any)
├── index.html            # Main HTML file
├── style.css             # CSS styles
├── app.js                # Main JavaScript application
├── vite.config.js        # Vite configuration
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

### Adding New Features

1. **Backend Changes**:
   - Add new functions in the `convex/` directory
   - Update `convex/schema.ts` if new tables are needed
   - Deploy with `npx convex deploy`

2. **Frontend Changes**:
   - Update HTML structure in `index.html`
   - Add styles in `style.css`
   - Implement functionality in `app.js`

## Deployment

### Frontend Deployment

The frontend can be deployed to any static hosting service:

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** to:
   - Vercel
   - Netlify
   - GitHub Pages
   - Firebase Hosting
   - Any web server

### Backend Deployment

Convex handles backend deployment automatically:

```bash
npx convex deploy
```

This deploys your schema and functions to Convex's global infrastructure.

## Backup Strategy

### Automatic Backups
Convex provides automatic backups on paid plans.

### Manual Backups
Export data manually:
```bash
npx convex export --path ./backup-$(date +%F).zip
```

### Scheduled Backups
Set up GitHub Actions or similar CI/CD for automated backups.

## Troubleshooting

### Common Issues

1. **Convex Connection Error**:
   - Check your `VITE_CONVEX_URL` environment variable
   - Ensure Convex development server is running
   - Verify internet connection

2. **Authentication Failures**:
   - Verify `CONVEX_OWNER_PASSWORD` is set correctly
   - Check that the password matches what you're entering

3. **Build Errors**:
   - Ensure all dependencies are installed: `npm install`
   - Clear cache: `rm -rf node_modules package-lock.json && npm install`

4. **Mobile Display Issues**:
   - The app is mobile-first, so it should work well on all devices
   - Check browser console for JavaScript errors

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```bash
VITE_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the development team.

## Roadmap

### Planned Features
- [ ] Barcode scanning for faster product entry
- [ ] Supplier management
- [ ] Purchase order tracking
- [ ] Advanced reporting and charts
- [ ] Multi-location support
- [ ] Staff management with role-based access
- [ ] Integration with payment gateways
- [ ] Automatic low-stock alerts
- [ ] Customer loyalty program
- [ ] Mobile app (React Native)

### Performance Improvements
- [ ] Implement virtual scrolling for large transaction lists
- [ ] Add data pagination for better performance
- [ ] Optimize image handling and caching
- [ ] Implement service worker for offline functionality

---

**Built with ❤️ for liquor store owners who want to focus on their business, not paperwork.**

# Liquor-Management-System
