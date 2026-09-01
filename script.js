document.addEventListener('DOMContentLoaded', () => {
    const savedName = sessionStorage.getItem('employeeName');
    if (savedName) {
        document.getElementById('login-overlay').classList.add('hidden-overlay');
        updateGreeting(savedName);
    }
});

document.getElementById('login-btn').addEventListener('click', () => {
    const nameVal = document.getElementById('login-name').value.trim();
    const emailVal = document.getElementById('login-email').value.trim();
    const passVal = document.getElementById('login-pass').value.trim();

    if (nameVal && emailVal && passVal) {
        sessionStorage.setItem('employeeName', nameVal);
        sessionStorage.setItem('employeeEmail', emailVal);
        document.getElementById('login-overlay').classList.add('hidden-overlay');
        updateGreeting(nameVal);
    } else {
        alert("Please fill all details to login.");
    }
});

function updateGreeting(name) {
    const slotEl = document.getElementById('user-session-slot');
    if (slotEl) {
        slotEl.className = 'user-session-info';
        slotEl.innerHTML = `<span>Hi, ${name}</span><button class="logout-btn" onclick="logoutUser()">Logout</button>`;
    }
}

function logoutUser() {
    sessionStorage.clear();
    location.reload();
}

let totalSalary = Number(localStorage.getItem('cashFlow_salary')) || 0;
let expenses = JSON.parse(localStorage.getItem('cashFlow_expenses')) || [];

let currentCurrency = 'INR';
let exchangeRates = {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095
};
let currencySymbol = '₹';

const salaryForm = document.getElementById('salary-form');
const totalSalaryInput = document.getElementById('total-salary');
const displaySalary = document.getElementById('display-salary');
const displayExpenses = document.getElementById('display-expenses');
const displayBalance = document.getElementById('display-balance');

const expenseForm = document.getElementById('expense-form');
const expenseNameInput = document.getElementById('expense-name');
const expenseAmountInput = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');

async function fetchExchangeRates() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/INR');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data && data.result === 'success' && data.rates) {
            exchangeRates = {
                INR: 1,
                USD: data.rates.USD,
                EUR: data.rates.EUR,
                GBP: data.rates.GBP
            };
            updateDashboard();
        } else {
            throw new Error('Invalid API response structure');
        }
    } catch (error) {
        console.warn('Live exchange rates unavailable. Using fallback rates.');
        const apiStatus = document.getElementById('api-status');
        if (apiStatus) {
            apiStatus.classList.remove('hidden');
        }
    }
}

document.getElementById('currency-select').addEventListener('change', function(event) {
    currentCurrency = event.target.value;
    if (currentCurrency === 'USD') currencySymbol = '$';
    else if (currentCurrency === 'EUR') currencySymbol = '€';
    else if (currentCurrency === 'GBP') currencySymbol = '£';
    else currencySymbol = '₹';

    updateDashboard();
});

salaryForm.addEventListener('submit', function(event) {
    event.preventDefault();
    
    const salaryValue = Number(totalSalaryInput.value);

    if (isNaN(salaryValue) || salaryValue < 0) {
        alert('Please enter a valid positive salary amount.');
        return;
    }

    totalSalary = salaryValue;
    totalSalaryInput.value = '';
    
    saveData();
    updateDashboard();
});

expenseForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const nameValue = expenseNameInput.value.trim();
    const amountValue = Number(expenseAmountInput.value);

    if (nameValue === '' || isNaN(amountValue) || amountValue < 0) {
        alert('Please enter a valid expense name and positive amount.');
        return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newExpense = {
        id: Date.now(),
        name: nameValue,
        amount: amountValue,
        date: formattedDate
    };

    expenses.push(newExpense);

    expenseNameInput.value = '';
    expenseAmountInput.value = '';

    saveData();
    updateDashboard();
});

function calculateTotals() {
    let totalExp = 0;
    for (let i = 0; i < expenses.length; i++) {
        totalExp += expenses[i].amount;
    }

    let remaining = totalSalary - totalExp;

    const rate = exchangeRates[currentCurrency] || 1;

    let convertedSalary = totalSalary * rate;
    let convertedExp = totalExp * rate;
    let convertedRemaining = remaining * rate;

    displaySalary.textContent = currencySymbol + convertedSalary.toFixed(2);
    displayExpenses.textContent = currencySymbol + convertedExp.toFixed(2);
    displayBalance.textContent = currencySymbol + convertedRemaining.toFixed(2);

    const alertBanner = document.getElementById('threshold-alert');
    const balanceCardText = document.getElementById('display-balance');

    if (totalSalary > 0 && remaining < (totalSalary * 0.10)) {
        alertBanner.classList.remove('hidden');
        balanceCardText.className = 'metric-value text-rose balance-warning-pulse';
    } else {
        alertBanner.classList.add('hidden');
        balanceCardText.className = 'metric-value text-emerald';
    }
}

const expenseSearchInput = document.getElementById('expense-search');

if (expenseSearchInput) {
    expenseSearchInput.addEventListener('input', function() {
        renderExpenses();
    });
}

function renderExpenses() {
    const searchTerm = expenseSearchInput ? expenseSearchInput.value.toLowerCase().trim() : '';
    
    let filteredExpenses = expenses;
    if (searchTerm !== '') {
        filteredExpenses = expenses.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(searchTerm);
            const amountMatch = item.amount.toString().includes(searchTerm);
            const dateMatch = item.date && item.date.toLowerCase().includes(searchTerm);
            return nameMatch || amountMatch || dateMatch;
        });
    }

    if (filteredExpenses.length === 0) {
        expenseList.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No matching expenses found.</td></tr>';
        return;
    }

    expenseList.innerHTML = '';
    const rate = exchangeRates[currentCurrency] || 1;

    for (let i = 0; i < filteredExpenses.length; i++) {
        const item = filteredExpenses[i];
        const row = document.createElement('tr');
        
        const convertedItemAmount = item.amount * rate;
        const itemDate = item.date || 'Manual / Legacy';

        row.innerHTML = `
            <td>${item.name}</td>
            <td><span style="font-size: 12px; color: var(--text-muted);">${itemDate}</span></td>
            <td>${currencySymbol}${convertedItemAmount.toFixed(2)}</td>
            <td class="text-right">
                <button onclick="deleteExpense(${item.id})" class="delete-btn" title="Delete Expense">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </td>
        `;

        expenseList.appendChild(row);
    }
}

function deleteExpense(id) {
    let targetIndex = -1;
    for (let i = 0; i < expenses.length; i++) {
        if (expenses[i].id === id) {
            targetIndex = i;
            break;
        }
    }

    if (targetIndex !== -1) {
        expenses.splice(targetIndex, 1);
        saveData();
        updateDashboard();
    }
}

function saveData() {
    localStorage.setItem('cashFlow_salary', totalSalary);
    localStorage.setItem('cashFlow_expenses', JSON.stringify(expenses));
}

let expenseChartInstance = null;

function renderChart() {
    const ctx = document.getElementById('expense-chart').getContext('2d');
    
    let totalExp = 0;
    for (let i = 0; i < expenses.length; i++) {
        totalExp += expenses[i].amount;
    }

    let remaining = totalSalary - totalExp;
    if (remaining < 0) remaining = 0;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    if (expenseChartInstance !== null) {
        expenseChartInstance.data.datasets[0].data = [totalExp, remaining];
        expenseChartInstance.data.datasets[0].borderColor = isDark ? '#1e293b' : '#ffffff';
        expenseChartInstance.options.plugins.legend.labels.color = isDark ? '#f8fafc' : '#1e293b';
        expenseChartInstance.options.animation.duration = 300;
        expenseChartInstance.update();
    } else {
        expenseChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Total Expenses', 'Remaining Balance'],
                datasets: [{
                    data: [totalExp, remaining],
                    backgroundColor: ['#f43f5e', '#10b981'],
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 800,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 16,
                            font: {
                                family: 'Inter',
                                size: 12,
                                weight: '600'
                            },
                            color: isDark ? '#f8fafc' : '#1e293b'
                        }
                    }
                }
            }
        });
    }
}

function updateDashboard() {
    calculateTotals();
    renderExpenses();
    renderChart();
}

document.getElementById('download-pdf-btn').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const empName = sessionStorage.getItem('employeeName') || 'N/A';
    const empEmail = sessionStorage.getItem('employeeEmail') || 'N/A';

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.text("Cash-Flow Financial Report", 14, 20);

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.text("Employee Name: " + empName, 14, 28);
    doc.text("Email: " + empEmail, 14, 34);
    doc.text("Generated on: " + new Date().toLocaleDateString(), 14, 40);

    const rate = exchangeRates[currentCurrency] || 1;
    
    let pdfSymbol = currencySymbol;
    if (currentCurrency === 'INR') {
        pdfSymbol = 'Rs. ';
    }

    const searchTerm = expenseSearchInput ? expenseSearchInput.value.toLowerCase().trim() : '';
    let targetExpenses = expenses;
    if (searchTerm !== '') {
        targetExpenses = expenses.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(searchTerm);
            const amountMatch = item.amount.toString().includes(searchTerm);
            const dateMatch = item.date && item.date.toLowerCase().includes(searchTerm);
            return nameMatch || amountMatch || dateMatch;
        });
    }

    let totalExp = 0;
    for (let i = 0; i < targetExpenses.length; i++) {
        totalExp += targetExpenses[i].amount;
    }
    let remaining = totalSalary - totalExp;

    let convertedSalary = totalSalary * rate;
    let convertedExp = totalExp * rate;
    let convertedRemaining = remaining * rate;

    doc.setFont("times", "bold");
    doc.text("Summary Overview (" + currentCurrency + "):", 14, 52);
    doc.setFont("times", "normal");
    doc.text("Total Salary: " + pdfSymbol + convertedSalary.toFixed(2), 14, 60);
    doc.text("Total Expenses: " + pdfSymbol + convertedExp.toFixed(2), 14, 68);
    doc.text("Remaining Balance: " + pdfSymbol + convertedRemaining.toFixed(2), 14, 76);

    doc.setFont("times", "bold");
    doc.text(searchTerm ? "Filtered Expense Transactions:" : "All Expense Transactions:", 14, 88);

    const tableBody = [];
    if (targetExpenses.length === 0) {
        tableBody.push(["No expenses found.", "", ""]);
    } else {
        for (let i = 0; i < targetExpenses.length; i++) {
            const item = targetExpenses[i];
            const convertedItemAmount = item.amount * rate;
            const itemDate = item.date || 'Manual / Legacy';
            tableBody.push([
                item.name,
                itemDate,
                pdfSymbol + convertedItemAmount.toFixed(2)
            ]);
        }
    }

    doc.autoTable({
        startY: 94,
        head: [['Expense Name', 'Date & Time', 'Amount']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], font: 'times', fontStyle: 'bold' },
        styles: { font: 'times', fontSize: 10 }
    });

    doc.save("CashFlow-Report-" + currentCurrency + ".pdf");
});

window.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('cashFlow_theme');

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.classList.add('active');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggleBtn.classList.remove('active');
    }

    themeToggleBtn.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggleBtn.classList.remove('active');
            localStorage.setItem('cashFlow_theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggleBtn.classList.add('active');
            localStorage.setItem('cashFlow_theme', 'dark');
        }
        updateDashboard();
    });

    updateDashboard();
    fetchExchangeRates();
});
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileDropdown = document.getElementById('mobile-dropdown');

    if (hamburgerBtn && mobileDropdown) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileDropdown.classList.toggle('hidden-dropdown');
        });

        document.addEventListener('click', (e) => {
            if (!mobileDropdown.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                mobileDropdown.classList.add('hidden-dropdown');
            }
        });
    }

    // Mobile menu ke andar user greeting shift karna
    const savedName = sessionStorage.getItem('employeeName');
    if (savedName) {
        const mobileUserSlot = document.getElementById('mobile-user-slot');
        if (mobileUserSlot) {
            mobileUserSlot.className = 'user-session-info';
            mobileUserSlot.innerHTML = `<span>Hi, ${savedName}</span><button class="logout-btn" onclick="logoutUser()">Logout</button>`;
        }
    }

    // Mobile menu ke andar theme toggle button ko copy karna
    const originalThemeBtn = document.getElementById('theme-toggle');
    const mobileThemeRow = document.querySelector('.mobile-theme-row');
    if (originalThemeBtn && mobileThemeRow) {
        const clonedThemeBtn = originalThemeBtn.cloneNode(true);
        clonedThemeBtn.id = 'mobile-theme-toggle';
        clonedThemeBtn.style.display = 'inline-block';
        mobileThemeRow.appendChild(clonedThemeBtn);

        clonedThemeBtn.addEventListener('click', () => {
            originalThemeBtn.click();
            if (originalThemeBtn.classList.contains('active')) {
                clonedThemeBtn.classList.add('active');
            } else {
                clonedThemeBtn.classList.remove('active');
            }
        });

        if (originalThemeBtn.classList.contains('active')) {
            clonedThemeBtn.classList.add('active');
        }
    }
});
['login-name', 'login-email', 'login-pass'].forEach(id => {
    const inputEl = document.getElementById(id);
    if (inputEl) {
        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('login-btn').click();
            }
        });
    }
});