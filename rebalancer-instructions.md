### **Prompt 1: Backend Scaffolding and API Setup**

"Set up a new backend service using **Node.js with Express.js**. Create the initial project structure and include a package.json file with dependencies for express, pg (for PostgreSQL), bcryptjs (for password hashing), and jsonwebtoken (for user sessions). Create a main server file server.js that initializes the Express app and listens on a port (e.g., 3000)."

**Example server.js:**

JavaScript

const express \= require('express');  
const app \= express();  
const PORT \= process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON bodies

// Basic route for testing  
app.get('/', (req, res) \=\> {  
  res.send('Backend server is running.');  
});

// Placeholder for API routes  
// const apiRoutes \= require('./routes/api');  
// app.use('/api', apiRoutes);

app.listen(PORT, () \=\> {  
  console.log(\`Server is listening on port ${PORT}\`);  
});

---

### **Prompt 2: Database Schema and User Authentication**

"Generate the SQL statements for a **PostgreSQL** database to create the necessary tables for this application. The schema should include:

1. A users table with columns for id, email, password\_hash, created\_at.  
2. A portfolios table with a foreign key to the users table (user\_id). It should include columns for id, portfolio\_name, and last\_updated.  
3. A positions table with a foreign key to the portfolios table (portfolio\_id). It should include columns for id, ticker, quantity, cost\_basis, and price."

---

### **Prompt 3: Migrating Core Logic to the Backend**

"Refactor the core tax harvesting logic from the client-side file src/scripts/tax-harvesting-algorithm.js into a new module on the backend.

1. Create a new file backend/services/taxHarvestingService.js.  
2. Port the main calculation function (e.g., runTaxHarvesting) into this file.  
3. Modify the function to accept a portfolio (as a JSON object) and a tax target as arguments, instead of reading from the DOM.  
4. Create an API endpoint at POST /api/calculate in a new routes/api.js file. This endpoint should receive portfolio data in the request body, call the taxHarvestingService, and return the generated buy/sell orders as a JSON response."

---

### **Prompt 4: Frontend Refactoring to a Single-Page Application (SPA)**

"Refactor the existing HTML files (index.html, model-portfolios.html, buy-orders.html, price-manager.html) into a single-page application using **React**.

1. Use create-react-app to set up the project structure.  
2. Create a main App.js component that handles routing between different views (e.g., 'Portfolio', 'Model Portfolios', 'Results').  
3. Convert the portfolio table from src/index.html into a reusable React component named PortfolioGrid.js.  
4. This component should fetch its data from the new backend API instead of local files."

---

### **Prompt 5: Implementing an Interactive and Editable Portfolio Grid**

"Enhance the PortfolioGrid.js React component to make it fully interactive and editable.

1. Use a state management library like **Redux** or **Zustand** to manage the portfolio data.  
2. Make the cells for price, quantity, and cost\_basis editable inputs.  
3. When a user edits a cell, the component's state should update.  
4. Implement a 'Re-calculate' button that sends the updated portfolio state to the POST /api/calculate backend endpoint and displays the new results without a page reload."

---

### **Prompt 6: Implementing Data Persistence (Save, Load, Edit)**

"Implement the functionality to save, load, and manage portfolios for authenticated users.

1. Create backend API endpoints for handling portfolios:  
   * POST /api/portfolios \- Saves a new portfolio to the database, linked to the authenticated user.  
   * GET /api/portfolios \- Retrieves a list of all saved portfolios for the current user.  
   * GET /api/portfolios/:id \- Retrieves a specific portfolio and its positions.  
   * PUT /api/portfolios/:id \- Updates an existing portfolio.  
2. On the frontend, create a 'Dashboard' view.  
3. In the Dashboard, display the list of saved portfolios fetched from GET /api/portfolios.  
4. Add buttons for each portfolio to 'Open', 'Edit', or 'Delete' it, which will call the corresponding API endpoints."