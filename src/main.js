import './style.css';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';

// --- STATE & UI ELEMENTS ---
let localTransactions = [];

const balanceEl = document.getElementById('balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const transactionListEl = document.getElementById('transaction-list');
const transactionForm = document.getElementById('transaction-form');
const loadingStateEl = document.getElementById('loading-state');
const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');
const closeModalBtn = document.getElementById('close-modal-btn');
const exportBtn = document.getElementById('export-btn');
const exportFormatSelect = document.getElementById('export-format');
const importBtn = document.getElementById('import-btn');
const importCsvInput = document.getElementById('import-csv-input');


// --- UTILITY FUNCTIONS ---

const formatCurrency = (number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);

const showMessage = (message) => {
    messageText.textContent = message;
    messageModal.classList.remove('hidden');
};

const triggerDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- LOCAL STORAGE LOGIC ---

const getTransactionsFromStorage = () => {
    const storedTransactions = localStorage.getItem('finance-transactions');
    return storedTransactions ? JSON.parse(storedTransactions) : [];
};

const saveTransactionsToStorage = (transactions) => {
    localStorage.setItem('finance-transactions', JSON.stringify(transactions));
};

// --- CORE LOGIC ---

const renderUI = () => {
    // Sort transactions by date, newest first
    localTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const transactions = localTransactions;
    transactionListEl.innerHTML = '';
    const hasTransactions = transactions.length > 0;

    exportBtn.disabled = !hasTransactions;
    exportFormatSelect.disabled = !hasTransactions;

    if (!hasTransactions) {
        loadingStateEl.innerHTML = '<p>No transactions yet. Add one to get started!</p>';
        transactionListEl.appendChild(loadingStateEl);
    } else if (transactionListEl.contains(loadingStateEl)) {
        transactionListEl.removeChild(loadingStateEl);
    }

    let income = 0;
    let expenses = 0;

    transactions.forEach(tx => {
        // Ensure amount is a number before calculation
        const amount = parseFloat(tx.amount) || 0;
        if (tx.type === 'income') {
            income += amount;
        } else {
            expenses += amount;
        }

        const li = document.createElement('li');
        const isIncome = tx.type === 'income';
        li.className = `flex items-center justify-between p-3 rounded-lg border ${isIncome ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`;
        const transactionDate = new Date(tx.createdAt).toLocaleDateString();

        li.innerHTML = `
            <div class="flex items-center overflow-hidden mr-2">
                <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                    ${isIncome ?
                        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>` :
                        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`
                    }
                </div>
                <div class="truncate">
                    <p class="font-medium text-slate-800 truncate" title="${tx.description}">${tx.description}</p>
                    <p class="text-xs text-slate-500">${transactionDate}</p>
                </div>
            </div>
            <div class="flex items-center flex-shrink-0">
                <span class="font-semibold text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}">
                    ${isIncome ? '+' : '-'}${formatCurrency(amount)}
                </span>
                <button data-id="${tx.id}" class="delete-btn ml-4 text-slate-400 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </div>
        `;
        transactionListEl.appendChild(li);
    });

    totalIncomeEl.textContent = formatCurrency(income);
    totalExpensesEl.textContent = formatCurrency(expenses);
    const balance = income - expenses;
    balanceEl.textContent = formatCurrency(balance);
    balanceEl.className = `text-4xl font-bold ${balance >= 0 ? 'text-slate-800' : 'text-red-600'}`;
};

const handleAddTransaction = (e) => {
    e.preventDefault();
    const description = transactionForm.description.value.trim();
    const amount = parseFloat(transactionForm.amount.value);
    const type = transactionForm.type.value;
    if (!description || isNaN(amount) || amount <= 0) {
        showMessage("Please enter a valid description and a positive amount.");
        return;
    }

    const newTransaction = {
        id: crypto.randomUUID(),
        description,
        amount,
        type,
        createdAt: new Date().toISOString()
    };

    localTransactions.push(newTransaction);
    saveTransactionsToStorage(localTransactions);
    renderUI();
    transactionForm.reset();
};

const handleDeleteTransaction = (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        localTransactions = localTransactions.filter(tx => tx.id !== id);
        saveTransactionsToStorage(localTransactions);
        renderUI();
    }
};

// --- IMPORT/EXPORT LOGIC ---

const handleExport = () => {
    const format = exportFormatSelect.value;
    if (!format) {
        showMessage("Please select an export format.");
        return;
    }

    switch (format) {
        case 'json':
            handleExportJSON();
            break;
        case 'csv':
            handleExportCSV();
            break;
        case 'pdf':
            handleExportPDF();
            break;
    }
    exportFormatSelect.value = "";
};

const handleExportJSON = () => {
    const jsonString = JSON.stringify(localTransactions, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    triggerDownload(blob, 'transactions.json');
};

const handleExportCSV = () => {
    const headers = ['ID', 'Description', 'Amount', 'Type', 'Date'];
    const csvRows = [headers.join(',')];
    localTransactions.forEach(tx => {
        const date = new Date(tx.createdAt).toISOString().split('T')[0];
        const description = `"${tx.description.replace(/"/g, '""')}"`;
        csvRows.push([tx.id, description, tx.amount, tx.type, date].join(','));
    });
    const csvString = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'transactions.csv');
};

const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Transaction History", 14, 16);
    const tableColumn = ["Date", "Description", "Type", "Amount"];
    const tableRows = [];

    localTransactions.forEach(tx => {
        const date = new Date(tx.createdAt).toLocaleDateString();
        const amount = (tx.type === 'income' ? '+' : '-') + formatCurrency(tx.amount);
        tableRows.push([date, tx.description, tx.type, amount]);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 22,
        headStyles: { fillColor: [78, 70, 229] },
        styles: { font: 'Inter', fontSize: 10 },
    });
    
    doc.save('transactions.pdf');
};

const handleImportClick = () => {
    importCsvInput.click();
};

const processImportedCSV = (event) => {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        try {
            const rows = text.split('\n').slice(1); // Skip header row
            const existingIds = new Set(localTransactions.map(tx => tx.id));
            let importedCount = 0;

            rows.forEach(row => {
                if (row.trim() === '') return;
                
                // NOTE: This is a simple parser. It will not handle commas within quoted fields.
                const columns = row.split(',');
                const id = columns[0];

                // Don't import transactions that already exist
                if (!existingIds.has(id)) {
                    const newTransaction = {
                        id: id,
                        description: columns[1].replace(/"/g, ''), // Basic un-quoting
                        amount: parseFloat(columns[2]),
                        type: columns[3],
                        createdAt: new Date(columns[4]).toISOString()
                    };

                    // Basic validation of the parsed data
                    if (newTransaction.id && newTransaction.description && !isNaN(newTransaction.amount) && (newTransaction.type === 'income' || newTransaction.type === 'expense')) {
                        localTransactions.push(newTransaction);
                        importedCount++;
                    }
                }
            });

            if (importedCount > 0) {
                saveTransactionsToStorage(localTransactions);
                renderUI();
                showMessage(`${importedCount} new transaction(s) imported successfully.`);
            } else {
                showMessage("No new transactions were found in the file to import.");
            }

        } catch (error) {
            console.error("Error parsing CSV:", error);
            showMessage("Could not parse the CSV file. Please ensure it is in the correct format.");
        } finally {
            // Reset the input value to allow importing the same file again
            importCsvInput.value = '';
        }
    };

    reader.readAsText(file);
};

// --- INITIALIZATION ---
const initialize = () => {
    // Set up event listeners
    transactionForm.addEventListener('submit', handleAddTransaction);
    transactionListEl.addEventListener('click', handleDeleteTransaction);
    closeModalBtn.addEventListener('click', () => messageModal.classList.add('hidden'));
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', handleImportClick);
    importCsvInput.addEventListener('change', processImportedCSV);

    // Load initial data and render the UI
    localTransactions = getTransactionsFromStorage();
    renderUI();
};

// --- START THE APP ---
initialize();
