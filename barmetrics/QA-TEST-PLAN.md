# BarMetrics - Comprehensive QA Test Plan

## 📋 Test Overview

**Application:** BarMetrics - Bar Inventory Management System
**Version:** 1.0
**Test Date:** 2026-02-06
**Test Environment:** Development (localhost:3000)

---

## 🧪 Test Users

| Username | PIN | Role | Purpose |
|----------|-----|------|---------|
| `bar` | Check DB | BARTENDER | Request creation, inventory tracking |
| `store` | Check DB | STOREKEEPER | Inventory management, fulfillment |
| `admin` | Check DB | MANAGER | Approval workflow, user management, reports |

---

## 1️⃣ Authentication & Authorization

### Test 1.1: Login Functionality
- [ ] **Navigate to login page** (/)
  - Should redirect to landing page if not authenticated
  - Landing page should be visible without login
- [ ] **Login with valid credentials**
  - Enter username: `bar`, correct PIN
  - Should redirect to `/dashboard`
  - Session should persist on refresh
- [ ] **Login with invalid credentials**
  - Should show error message
  - Should not redirect
- [ ] **Session persistence**
  - Refresh page after login
  - Should remain logged in
- [ ] **Logout**
  - Click logout button
  - Should redirect to `/login`
  - Session should be cleared

**Expected Results:** ✅ All authentication flows work correctly

---

### Test 1.2: Route Protection
- [ ] **Access protected route without login**
  - Navigate to `/dashboard` without authentication
  - Should redirect to `/login?redirect=/dashboard`
- [ ] **After login, return to intended page**
  - Should redirect to original destination
- [ ] **API endpoints without auth**
  - Try accessing `/api/products` without session
  - Should return 401 Unauthorized

**Expected Results:** ✅ All routes properly protected

---

## 2️⃣ Landing Page

### Test 2.1: Public Landing Page
- [ ] **Access root path** (/)
  - Should load without authentication
  - Should show BarMetrics branding
  - Should display features section
  - Should show "Sign In" button
- [ ] **Responsive design**
  - Test on mobile viewport
  - Test on tablet viewport
  - All sections should be readable
- [ ] **Navigation**
  - Click "Sign In" → Should go to `/login`
  - Click "Learn More" → Should scroll to features

**Expected Results:** ✅ Landing page is professional and functional

---

## 3️⃣ Navigation & UI

### Test 3.1: Navigation Header
- [ ] **Logo/Brand**
  - Click BarMetrics logo → Should go to `/dashboard`
- [ ] **Menu items visibility by role**
  - Login as BARTENDER → See: Home, Products, Weigh & Track, Requests, Sessions
  - Login as STOREKEEPER → See: Home, Products, SKUs, Weigh & Track, Sessions
  - Login as MANAGER → See all menu items including Users
- [ ] **Mobile hamburger menu**
  - Click menu button → Dropdown should open
  - Click outside → Menu should close
  - Click menu item → Should navigate and close menu
- [ ] **User info display**
  - Should show username and role badge
  - Settings button should be visible
  - Logout button should be visible

**Expected Results:** ✅ Navigation adapts to user roles correctly

---

## 4️⃣ Product Management

### Test 4.1: Product List
- [ ] **View products page** (`/products`)
  - Should display all 115+ products
  - Should show brand, name, category, volume, ABV
- [ ] **Search functionality**
  - Search for "Absolut" → Should filter results
  - Search for "Whiskey" → Should show whiskey products
  - Clear search → Should show all products
- [ ] **Category filter**
  - Filter by "Hard Liquor" → Should show only spirits
  - Filter by "Cocktail" → Should show only cocktails
  - Filter by "Wine" → Should show only wines
- [ ] **Pagination/Scroll**
  - Should handle large product list efficiently
  - No performance issues with 100+ items

**Expected Results:** ✅ All 90-115 products displayed correctly

---

### Test 4.2: Product Details
- [ ] **Click on a product**
  - Should show detailed product information
  - Should display: Brand, Name, Category, ABV, Volume, Density, Tare Weight
- [ ] **Linked SKUs**
  - Should show associated SKU codes
  - Click SKU → Should navigate to SKU details

**Expected Results:** ✅ Product details are complete and accurate

---

### Test 4.3: Product Import
- [ ] **Access import page** (`/products/import`)
  - Manager should have access
  - Should show Excel upload form
- [ ] **Upload Excel file**
  - Upload valid Excel file
  - Should preview data
  - Should allow mapping columns
  - Should import successfully
- [ ] **Error handling**
  - Upload invalid file → Should show error
  - Upload wrong format → Should show validation error

**Expected Results:** ✅ Product import works correctly

---

## 5️⃣ SKU Management

### Test 5.1: SKU List
- [ ] **View SKUs page** (`/skus`)
  - Should display all 112 SKUs
  - Should show SKU code, name, size, category
- [ ] **Search by SKU code**
  - Search "ABSOLUT-VODKA-750" → Should find specific SKU
  - Search by product name → Should find related SKUs
- [ ] **Filter by category**
  - Filter by category → Should show matching SKUs
  - Filter by active status → Should work correctly
- [ ] **Permission check**
  - BARTENDER should see SKU list (view only)
  - STOREKEEPER should have full access
  - MANAGER should have full access

**Expected Results:** ✅ All 112 SKUs displayed and searchable

---

### Test 5.2: SKU Details
- [ ] **Click on SKU**
  - Should show full SKU information
  - Should display: Code, Name, Size, Category, ABV, Tare Weight, Density
- [ ] **Linked products**
  - Should show associated product
  - Should show isPrimary flag

**Expected Results:** ✅ SKU details are accurate

---

### Test 5.3: Create/Edit SKU
- [ ] **Create new SKU** (Manager/Storekeeper)
  - Fill form with valid data
  - Should create successfully
  - Should generate unique SKU code
- [ ] **Edit existing SKU**
  - Update tare weight
  - Update density
  - Should save changes
- [ ] **Link SKU to Product**
  - Select product from dropdown
  - Should create ProductSKU relation
  - Should show in both product and SKU views

**Expected Results:** ✅ SKU CRUD operations work correctly

---

## 6️⃣ Weigh & Track (Bluetooth Scale)

### Test 6.1: Weigh Page Access
- [ ] **Navigate to Weigh & Track** (`/weigh`)
  - Should load without errors
  - Should show Bluetooth connection card
  - Should show session selector
  - Should show product/SKU picker
- [ ] **Page layout**
  - Two-column layout on desktop
  - Stacked layout on mobile
  - All sections visible and functional

**Expected Results:** ✅ Weigh page loads correctly

---

### Test 6.2: Session Management
- [ ] **Create new session**
  - Click "New Session" or auto-create on first save
  - Should create session with timestamp name
  - Should appear in session dropdown
- [ ] **Select existing session**
  - Choose from dropdown
  - Should load session details
  - Should allow adding measurements

**Expected Results:** ✅ Sessions work correctly

---

### Test 6.3: Product Selection
- [ ] **Search for product**
  - Type product name → Should filter results
  - Select product → Should load into form
  - Should show product specs (ABV, volume, tare weight)
- [ ] **Select SKU**
  - Choose specific SKU → Should use SKU specs
  - Should show SKU code and details

**Expected Results:** ✅ Product selection works smoothly

---

### Test 6.4: Weight Input & Calculation
- [ ] **Manual weight entry**
  - Enter gross weight (e.g., 1200g)
  - Should calculate automatically:
    - Net mass (gross - tare)
    - Volume in ml
    - Percent full
    - Pours remaining
- [ ] **Calculation accuracy**
  - Test with known values
  - Empty bottle (tare weight only) → Should show 0ml
  - Full bottle → Should show 100% full
  - Half full → Should show ~50%
- [ ] **Visual indicator**
  - Bottle fill visualization should match percentage
  - Should animate smoothly
- [ ] **Edge cases**
  - Weight less than tare → Should show error/warning
  - Weight way over full → Should show anomaly

**Expected Results:** ✅ Calculations are accurate using density formula

---

### Test 6.5: Bluetooth Scale Integration
- [ ] **Check browser compatibility**
  - Chrome/Edge → Should show "Connect Scale" button
  - Firefox/Safari → Should show "Not supported" message
- [ ] **Connect Bluetooth scale** (if available)
  - Click "Connect Scale"
  - Should show device picker
  - Select scale → Should connect
  - Should show "Connected" status
- [ ] **Auto-weight capture**
  - Place bottle on scale
  - Weight should auto-populate in input field
  - Calculations should update in real-time
- [ ] **Disconnection handling**
  - Remove scale → Should show disconnected
  - Should allow manual input as fallback

**Expected Results:** ✅ Bluetooth works (or gracefully falls back to manual)

---

### Test 6.6: Save Measurement
- [ ] **Save valid measurement**
  - Enter/capture weight
  - Click "Save"
  - Should save to database
  - Should show success message
  - Should clear form for next bottle
- [ ] **Save & Next**
  - Save measurement
  - Should keep session active
  - Should clear product selection
  - Should keep scale connected
  - Ready for next bottle
- [ ] **Validation**
  - Try to save without product → Should show error
  - Try to save without weight → Should show error

**Expected Results:** ✅ Measurements save correctly to session

---

## 7️⃣ Liquor Requests

### Test 7.1: Request List (Bartender View)
- [ ] **Login as bartender**
- [ ] **Navigate to Requests** (`/requests`)
  - Should see "New Request" button ✅
  - Should see description: "Submit and manage your inventory requests"
  - Should see only own requests
- [ ] **Filter by status**
  - Filter: Pending → Should show pending requests
  - Filter: Approved → Should show approved requests
  - Filter: All → Should show all own requests

**Expected Results:** ✅ Bartender sees correct UI and own requests only

---

### Test 7.2: Create Request (Bartender Only)
- [ ] **Click "New Request"**
  - Should navigate to `/requests/new`
  - Should show form with:
    - Product/SKU selector (dropdown with search)
    - Quantity input
    - Urgency selector (Low, Normal, High, Urgent)
    - Reason input (optional)
    - Notes textarea (optional)
- [ ] **Submit valid request**
  - Select product: "Absolut Vodka"
  - Quantity: 5
  - Urgency: High
  - Reason: "Running low"
  - Click "Submit Request"
  - Should create request with status PENDING
  - Should redirect to requests list
  - Should show success message
- [ ] **Validation**
  - Submit without product → Should show error
  - Submit with quantity 0 → Should show error
  - Submit with quantity > 1000 → Should show error

**Expected Results:** ✅ Bartenders can create requests successfully

---

### Test 7.3: Request List (Storekeeper View)
- [ ] **Login as storekeeper**
- [ ] **Navigate to Requests**
  - Should NOT see "New Request" button ❌
  - Should see description: "View inventory requests"
  - Should see all requests (not just own)
- [ ] **Try to access /requests/new directly**
  - Navigate to URL
  - Form might load, but submit should fail with 403
- [ ] **View request details**
  - Should see: Product, Quantity, Urgency, Requester, Status
  - Should NOT see approve/reject buttons

**Expected Results:** ✅ Storekeepers can only view, not create/approve

---

### Test 7.4: Request Approval (Manager Only)
- [ ] **Login as manager**
- [ ] **Navigate to Requests**
  - Should NOT see "New Request" button ❌
  - Should see description: "Review and approve inventory requests"
  - Should see all requests from all users
  - Should see approve/reject buttons for PENDING requests
- [ ] **Approve request**
  - Click ✓ (Approve) button on pending request
  - Should change status to APPROVED
  - Should record reviewer name
  - Should timestamp the review
- [ ] **Reject request**
  - Click ✗ (Reject) button
  - Should prompt for rejection reason
  - Enter reason: "Out of stock"
  - Should change status to REJECTED
  - Should save rejection notes
- [ ] **Delete request**
  - Manager should be able to delete any request
  - Click delete button
  - Should confirm deletion
  - Should remove from list

**Expected Results:** ✅ Only managers can approve/reject requests

---

### Test 7.5: Request Permissions API
- [ ] **Test API as Bartender**
  - POST `/api/requests` → Should succeed ✅
  - GET `/api/requests` → Should return only own requests
  - PATCH `/api/requests/[id]` (approve) → Should fail 403 ❌
- [ ] **Test API as Storekeeper**
  - POST `/api/requests` → Should fail 403 ❌
  - GET `/api/requests` → Should return all requests ✅
  - PATCH `/api/requests/[id]` (approve) → Should fail 403 ❌
- [ ] **Test API as Manager**
  - POST `/api/requests` → Should fail 403 ❌ (managers don't create)
  - GET `/api/requests` → Should return all requests ✅
  - PATCH `/api/requests/[id]` (approve) → Should succeed ✅
  - DELETE `/api/requests/[id]` → Should succeed ✅

**Expected Results:** ✅ All API permissions enforced correctly

---

## 8️⃣ Session Management

### Test 8.1: Session List
- [ ] **Navigate to Sessions** (`/sessions`)
  - Should show all inventory sessions
  - Should display: Name, Date, Status, Measurement Count
- [ ] **Filter sessions**
  - Filter by status: Active, Completed
  - Filter by date range
  - Search by name

**Expected Results:** ✅ Sessions displayed correctly

---

### Test 8.2: Session Details
- [ ] **Click on session**
  - Should show session details
  - Should list all measurements in session
  - Should show totals and statistics
- [ ] **View measurements**
  - Should show: Product, Weight, Volume, Percent Full, Timestamp
  - Should allow sorting
  - Should allow exporting

**Expected Results:** ✅ Session details are comprehensive

---

### Test 8.3: Quick Count Mode
- [ ] **Create Quick Count session**
  - Should copy previous session structure
  - Should allow rapid re-weighing
  - Should highlight anomalies (large changes)
- [ ] **Anomaly detection**
  - Large variance → Should flag
  - Over capacity reading → Should warn
  - Negative volume → Should alert

**Expected Results:** ✅ Quick Count mode speeds up inventory

---

## 9️⃣ Reports & Analytics

### Test 9.1: Reports Dashboard
- [ ] **Navigate to Reports** (`/reports`)
  - Should show summary cards:
    - Total Products
    - Total SKUs
    - Active Sessions
    - Recent Activity
- [ ] **Charts and graphs**
  - Inventory levels by category
  - Usage trends
  - Low stock alerts

**Expected Results:** ✅ Reports provide actionable insights

---

### Test 9.2: Export Functionality
- [ ] **Export to Excel**
  - Select date range
  - Select data type (sessions, measurements, requests)
  - Click "Export"
  - Should download Excel file
  - File should contain correct data
- [ ] **Export to CSV**
  - Should generate CSV with proper formatting
  - Should handle special characters

**Expected Results:** ✅ Data exports work correctly

---

## 🔟 User Management (Manager Only)

### Test 10.1: User List
- [ ] **Navigate to Users** (`/users`)
  - Should be visible only to MANAGER role
  - Should show all users with roles
  - Should show active/inactive status
- [ ] **Non-manager access**
  - Login as BARTENDER → Menu item hidden
  - Navigate to `/users` directly → Should return 403/redirect

**Expected Results:** ✅ Only managers access user management

---

### Test 10.2: Create User
- [ ] **Click "New User"**
  - Fill form: Username, PIN, Display Name, Role
  - Select role: BARTENDER, STOREKEEPER, or MANAGER
  - Click "Create"
  - Should create new user
  - User should be able to login immediately
- [ ] **Validation**
  - Duplicate username → Should show error
  - Invalid PIN (not 4 digits) → Should show error
  - Missing required fields → Should show error

**Expected Results:** ✅ User creation works correctly

---

### Test 10.3: Edit User
- [ ] **Update user details**
  - Change display name
  - Change role
  - Toggle active/inactive status
  - Should save changes
- [ ] **Reset PIN**
  - Should allow manager to reset user PIN
  - Should require confirmation

**Expected Results:** ✅ User management is functional

---

## 1️⃣1️⃣ Mobile Responsiveness

### Test 11.1: Landing Page Mobile
- [ ] **Viewport: 375px (iPhone SE)**
  - Layout should stack vertically
  - Text should be readable
  - Buttons should be tappable (min 44px)
  - Images should scale properly
- [ ] **Viewport: 768px (iPad)**
  - Should use tablet layout
  - Two-column sections where appropriate

**Expected Results:** ✅ Landing page is mobile-friendly

---

### Test 11.2: Dashboard Mobile
- [ ] **Test on phone**
  - Cards should stack
  - Navigation should use hamburger menu
  - All features should be accessible
- [ ] **Touch interactions**
  - Tap targets should be large enough
  - Swipe gestures should work (if implemented)
  - No horizontal scroll issues

**Expected Results:** ✅ Dashboard works well on mobile

---

### Test 11.3: Forms Mobile
- [ ] **Weigh & Track on mobile**
  - Form should be scrollable
  - Keyboard should not hide inputs
  - Scale connection should work (if browser supports)
- [ ] **Request form on mobile**
  - Dropdowns should be touch-friendly
  - Text inputs should be appropriately sized
  - Submit button should be accessible

**Expected Results:** ✅ All forms are mobile-optimized

---

## 1️⃣2️⃣ Data Integrity & Validation

### Test 12.1: Database Constraints
- [ ] **Unique constraints**
  - Try to create duplicate SKU code → Should fail
  - Try to create duplicate username → Should fail
- [ ] **Foreign key constraints**
  - Try to delete product with linked SKUs → Should handle gracefully
  - Try to delete user with requests → Should handle gracefully
- [ ] **Data types**
  - Weight fields accept only numbers
  - Date fields formatted correctly
  - Boolean fields work properly

**Expected Results:** ✅ Database integrity maintained

---

### Test 12.2: Input Validation
- [ ] **Numeric inputs**
  - Weight: Accept positive numbers, decimal points
  - Quantity: Accept only positive integers
  - ABV: Accept 0-100 range
- [ ] **Text inputs**
  - Max length enforcement
  - XSS prevention (try entering `<script>`)
  - SQL injection prevention (try `' OR 1=1--`)
- [ ] **Required fields**
  - Should show error if left empty
  - Should prevent form submission

**Expected Results:** ✅ All inputs properly validated

---

## 1️⃣3️⃣ Error Handling

### Test 13.1: Network Errors
- [ ] **Simulate offline**
  - Turn off network
  - Try to submit form → Should show error
  - Should offer retry option
- [ ] **API timeout**
  - Should show loading state
  - Should timeout gracefully
  - Should show user-friendly error

**Expected Results:** ✅ Errors handled gracefully

---

### Test 13.2: Invalid Data
- [ ] **404 Pages**
  - Navigate to `/nonexistent` → Should show 404
  - Should have link back to home
- [ ] **Malformed requests**
  - Send invalid JSON to API → Should return 400
  - Should include error message
- [ ] **Permission errors**
  - Access denied → Should show 403
  - Should explain why access denied

**Expected Results:** ✅ All errors have clear messages

---

## 1️⃣4️⃣ Performance

### Test 14.1: Page Load Times
- [ ] **Initial load**
  - Landing page < 2s
  - Dashboard < 3s
  - Product list (115 items) < 3s
- [ ] **Navigation**
  - Page transitions smooth
  - No blocking operations
  - Lazy loading where appropriate

**Expected Results:** ✅ Performance is acceptable

---

### Test 14.2: Large Datasets
- [ ] **Pagination**
  - Products list handles 100+ items
  - SKUs list handles 100+ items
  - Requests list handles 50+ items
- [ ] **Search performance**
  - Search should be responsive
  - Results should filter quickly

**Expected Results:** ✅ No performance degradation with data

---

## 1️⃣5️⃣ Security

### Test 15.1: Authentication Security
- [ ] **Session management**
  - Sessions expire after 24 hours
  - Logout clears session completely
  - No session fixation vulnerabilities
- [ ] **Password/PIN security**
  - PINs not visible in browser
  - PINs hashed in database
  - No PIN in URL or logs

**Expected Results:** ✅ Authentication is secure

---

### Test 15.2: Authorization Security
- [ ] **Role-based access**
  - Cannot escalate privileges
  - Cannot access other users' data (except managers)
  - API enforces permissions server-side
- [ ] **CSRF protection**
  - Forms should have CSRF tokens (if implemented)
  - API should validate origin

**Expected Results:** ✅ Authorization is enforced

---

## 📊 Test Summary Template

```
Total Tests: _____
Passed: _____ ✅
Failed: _____ ❌
Blocked: _____ ⏸️
Not Tested: _____ ⊘

Critical Issues: _____
Major Issues: _____
Minor Issues: _____
Enhancements: _____
```

---

## 🐛 Bug Report Template

```markdown
## Bug #[ID]: [Short Description]

**Severity:** Critical / Major / Minor
**Priority:** High / Medium / Low
**Status:** Open / In Progress / Fixed / Closed

**Environment:**
- Browser:
- OS:
- User Role:
- Date Found:

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**


**Actual Result:**


**Screenshots/Logs:**


**Notes:**

```

---

## ✅ Sign-Off

**Tested By:** _____________________
**Date:** _____________________
**Build Version:** _____________________
**Approved for Production:** ☐ Yes ☐ No
**Comments:**

---

*End of QA Test Plan*
