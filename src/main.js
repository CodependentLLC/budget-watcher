import './style.css';

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
        if (tx.type === 'income') income += tx.amount;
        else expenses += tx.amount;

        const li = document.createElement('li');
        const isIncome = tx.type === 'income';
        li.className = `flex items-center justify-between p-3 rounded-lg border ${isIncome ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`;
        const transactionDate = new Date(tx.createdAt).toLocaleDateString();

        li.innerHTML = `
            <div class="flex items-center">
                <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4 ${isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                    ${isIncome ?
                        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>` :
                        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`
                    }
                </div>
                <div>
                    <p class="font-medium text-slate-800">${tx.description}</p>
                    <p class="text-xs text-slate-500">${transactionDate}</p>
                </div>
            </div>
            <div class="flex items-center">
                <span class="font-semibold text-lg ${isIncome ? 'text-green-600' : 'text-red-600'}">
                    ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
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

    localTransactions.unshift(newTransaction); // Add to the beginning
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

// --- EXPORT LOGIC ---

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
    // Reset select
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
        // Enclose description in quotes and escape existing quotes
        const description = `"${tx.description.replace(/"/g, '""')}"`;
        csvRows.push([tx.id, description, tx.amount, tx.type, date].join(','));
    });
    // Prepend a BOM to ensure Excel opens it correctly
    const csvString = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, 'transactions.csv');
};

const handleExportPDF = () => {
    // Dynamically import jsPDF to avoid errors in environments where window is not defined
    import('jspdf').then(({ jsPDF }) => {
        import('jspdf-autotable').then(() => {
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
                headStyles: { fillColor: [78, 70, 229] }, // Indigo color
                styles: { font: 'Inter', fontSize: 10 },
            });
            
            doc.save('transactions.pdf');
        });
    });
};

// --- INITIALIZATION ---
const initialize = () => {
    localTransactions = getTransactionsFromStorage();
    renderUI();
};

// --- EVENT LISTENERS ---
transactionForm.addEventListener('submit', handleAddTransaction);
transactionListEl.addEventListener('click', handleDeleteTransaction);
closeModalBtn.addEventListener('click', () => messageModal.classList.add('hidden'));
exportBtn.addEventListener('click', handleExport);

// --- START THE APP ---
initialize();
