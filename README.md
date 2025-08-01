# Tax Harvesting Calculator

An advanced tax harvesting optimization tool that helps investors find optimal trades to meet their tax goals.

## Features

- **Portfolio Analysis**: Upload cost basis CSV files to analyze current holdings
- **Tax Optimization**: Set annual targets for short-term and long-term gains/losses
- **Advanced Algorithm**: Uses optimization algorithms to find the best combination of trades
- **Model Portfolios**: Manage and use predefined portfolio allocation models
- **Buy Order Generation**: Generate buy orders to reinvest proceeds from sales

## Project Structure

```
tax-harvesting/
├── src/                    # Source HTML files
│   ├── index.html         # Main tax harvesting calculator
│   ├── buy-orders.html    # Buy order generation page
│   └── model-portfolios.html # Portfolio model management
├── docs/                  # Documentation
│   ├── README             # Original readme
│   ├── Algorithim Development Strategy.md
│   └── Algorithm_Instructions_and_Process.md
├── data/                  # Data files
│   ├── templates/         # CSV template files
│   │   ├── Current Portfolio.csv
│   │   └── YTD Realized Positions.csv
│   └── models/           # Portfolio model CSV files
│       ├── 100-0.csv
│       ├── 80-20.csv
│       ├── All Equity.csv
│       ├── Fixed-Income (Tax Aware).csv
│       ├── Fixed-Income.csv
│       └── Tactical Equity.csv
├── assets/               # Static assets (CSS, JS, images)
│   ├── css/
│   └── js/
├── archive/              # Archived/old files
└── README.md            # This file
```

## Getting Started

1. Open `src/index.html` in your web browser
2. Upload your cost basis CSV file
3. Optionally upload YTD realized gains CSV
4. Set your target gains/losses for the year
5. Review and select positions to include in the algorithm
6. Generate recommendations
7. Export results or proceed to buy order generation

## CSV File Formats

### Cost Basis CSV
Required columns:
- Symbol
- Acquired (date)
- Quantity
- Market Value
- Cost Basis
- Holding Period (Long/Short)

### YTD Realized Gains CSV
Required columns:
- Symbol
- Short Term Realized Gain/(Loss)
- Long Term Realized Gain/(Loss)

## Technology Stack

- HTML5
- CSS3 (Tailwind CSS)
- Vanilla JavaScript
- No backend required - runs entirely in the browser

## License

This project is for educational and personal use.