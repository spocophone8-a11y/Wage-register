/* ===== Wage Register — app logic =====
   Data lives in the browser's localStorage (works fully offline, no server).
   Use "Export to Excel (CSV)" to save a copy as a .csv file, which opens
   directly in Excel. Use "Import from Excel (CSV)" to load a previously
   exported file back in (e.g. on a new device, or to restore a backup).
*/

const Ledger = (function () {

  const LABORERS_KEY = "wr_laborers";     // [{code, name}]
  const TRANSACTIONS_KEY = "wr_transactions"; // [{id, code, date, type, description, amount}]

  // ---------- storage ----------

  function getLaborers() {
    try { return JSON.parse(localStorage.getItem(LABORERS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveLaborers(list) {
    localStorage.setItem(LABORERS_KEY, JSON.stringify(list));
  }
  function getTransactions() {
    try { return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveTransactions(list) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
  }

  function findLaborer(code) {
    return getLaborers().find(l => l.code.toLowerCase() === String(code).toLowerCase());
  }

  function upsertLaborer(code, name) {
    const laborers = getLaborers();
    const existing = laborers.find(l => l.code.toLowerCase() === code.toLowerCase());
    if (existing) {
      if (name) existing.name = name;
    } else {
      laborers.push({ code, name: name || code });
    }
    saveLaborers(laborers);
  }

  function addTransaction(entry) {
    const transactions = getTransactions();
    entry.id = "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    transactions.push(entry);
    saveTransactions(transactions);
  }

  // ---------- balances ----------

  function computeBalance(code) {
    const txs = getTransactions().filter(t => t.code.toLowerCase() === code.toLowerCase());
    let wages = 0, paid = 0;
    txs.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === "wage") wages += amt;
      else paid += amt;
    });
    return { wages, paid, balance: wages - paid };
  }

  function money(n) {
    const abs = Math.abs(n);
    return abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ---------- dashboard ----------

  function renderDashboard() {
    const laborers = getLaborers();
    const body = document.getElementById("ledgerBody");
    const empty = document.getElementById("emptyState");
    const summaryRow = document.getElementById("summaryRow");
    body.innerHTML = "";

    if (laborers.length === 0) {
      empty.hidden = false;
    } else {
      empty.hidden = true;
    }

    let totalOwe = 0, totalOver = 0;

    laborers
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(l => {
        const { wages, paid, balance } = computeBalance(l.code);
        if (balance > 0) totalOwe += balance;
        if (balance < 0) totalOver += Math.abs(balance);

        const tr = document.createElement("tr");
        let balanceHtml;
        if (balance > 0) {
          balanceHtml = `<span class="balance-owe">${money(balance)}</span>`;
        } else if (balance < 0) {
          balanceHtml = `<span class="balance-over">- ${money(balance)}</span>`;
        } else {
          balanceHtml = `<span class="balance-settled">0.00 (settled)</span>`;
        }

        tr.innerHTML = `
          <td>${escapeHtml(l.code)}</td>
          <td><a class="laborer-name-link" href="details.html?code=${encodeURIComponent(l.code)}">${escapeHtml(l.name)}</a></td>
          <td class="num">${money(wages)}</td>
          <td class="num">${money(paid)}</td>
          <td class="num">${balanceHtml}</td>
        `;
        body.appendChild(tr);
      });

    summaryRow.innerHTML = `
      <div class="chip chip-owe">
        <span class="chip-label">Total we owe</span>
        <span class="chip-value">${money(totalOwe)}</span>
      </div>
      <div class="chip chip-over">
        <span class="chip-label">Total overpaid to us</span>
        <span class="chip-value">${money(totalOver)}</span>
      </div>
      <div class="chip">
        <span class="chip-label">Laborers</span>
        <span class="chip-value">${laborers.length}</span>
      </div>
    `;

    // search filter
    const searchBox = document.getElementById("searchBox");
    if (searchBox) {
      searchBox.addEventListener("input", () => {
        const q = searchBox.value.trim().toLowerCase();
        Array.from(body.children).forEach(tr => {
          const text = tr.textContent.toLowerCase();
          tr.style.display = text.includes(q) ? "" : "none";
        });
      });
    }

    // export / import
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportCsv);
    const importFile = document.getElementById("importFile");
    if (importFile) importFile.addEventListener("change", handleImport);
  }

  // ---------- details ----------

  function renderDetails() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code") || "";
    const laborer = findLaborer(code);
    const head = document.getElementById("detailHead");
    const historyBody = document.getElementById("historyBody");
    const noHistory = document.getElementById("noHistory");

    if (!laborer) {
      head.innerHTML = `<p>No laborer found for code "${escapeHtml(code)}".</p>`;
      return;
    }

    const { wages, paid, balance } = computeBalance(code);
    let balClass = "balance-settled", balLabel = "Settled";
    if (balance > 0) { balClass = "balance-owe"; balLabel = "We owe them"; }
    if (balance < 0) { balClass = "balance-over"; balLabel = "They owe us"; }

    head.innerHTML = `
      <div>
        <h2>${escapeHtml(laborer.name)}</h2>
        <span class="code-tag">Code: ${escapeHtml(laborer.code)} &nbsp;•&nbsp; Wages recorded: ${money(wages)} &nbsp;•&nbsp; Paid: ${money(paid)}</span>
      </div>
      <div class="detail-balance">
        <span class="chip-label">${balLabel}</span>
        <span class="chip-value ${balClass}">${balance < 0 ? "- " : ""}${money(balance)}</span>
      </div>
    `;

    const txs = getTransactions()
      .filter(t => t.code.toLowerCase() === code.toLowerCase())
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    historyBody.innerHTML = "";
    if (txs.length === 0) {
      noHistory.hidden = false;
    } else {
      noHistory.hidden = true;
      txs.forEach(t => {
        const tr = document.createElement("tr");
        const typeLabel = t.type === "wage"
          ? `<span class="type-wage">Wage earned</span>`
          : `<span class="type-payment">Payment made</span>`;
        tr.innerHTML = `
          <td>${escapeHtml(t.date)}</td>
          <td>${typeLabel}</td>
          <td>${escapeHtml(t.description || "")}</td>
          <td class="num">${money(t.amount)}</td>
        `;
        historyBody.appendChild(tr);
      });
    }
  }

  // ---------- add entry ----------

  function initAddEntry() {
    const codeInput = document.getElementById("codeInput");
    const nameInput = document.getElementById("nameInput");
    const nameHint = document.getElementById("nameHint");
    const dateInput = document.getElementById("dateInput");
    const form = document.getElementById("entryForm");
    const saveMsg = document.getElementById("saveMsg");

    // default date = today
    const today = new Date();
    dateInput.value = today.toISOString().slice(0, 10);

    codeInput.addEventListener("blur", lookupCode);
    codeInput.addEventListener("input", () => { nameHint.textContent = ""; });

    function lookupCode() {
      const code = codeInput.value.trim();
      if (!code) return;
      const laborer = findLaborer(code);
      if (laborer) {
        nameInput.value = laborer.name;
        nameHint.textContent = `Existing laborer found: ${laborer.name}`;
      } else {
        nameHint.textContent = `New code — enter a name to register this laborer.`;
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const code = codeInput.value.trim();
      const name = nameInput.value.trim();
      const date = dateInput.value;
      const type = document.getElementById("typeInput").value;
      const description = document.getElementById("descInput").value.trim();
      const amount = parseFloat(document.getElementById("amountInput").value);

      if (!code || !date || !description || isNaN(amount)) {
        saveMsg.textContent = "Please fill in all fields.";
        saveMsg.style.color = "var(--red)";
        return;
      }

      upsertLaborer(code, name);
      addTransaction({ code, date, type, description, amount });

      saveMsg.textContent = "Entry saved.";
      saveMsg.style.color = "var(--green)";
      form.reset();
      dateInput.value = new Date().toISOString().slice(0, 10);
      nameHint.textContent = "";
      setTimeout(() => { saveMsg.textContent = ""; }, 2500);
    });
  }

  // ---------- CSV export / import ----------

  function csvEscape(val) {
    const s = String(val ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function exportCsv() {
    const laborers = getLaborers();
    const transactions = getTransactions();
    const rows = [
      ["RecordType", "Code", "Name", "Date", "Type", "Description", "Amount"]
    ];
    laborers.forEach(l => rows.push(["Laborer", l.code, l.name, "", "", "", ""]));
    transactions.forEach(t => rows.push([
      "Transaction", t.code, "", t.date, t.type, t.description, t.amount
    ]));
    const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `wage-register-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function parseCsv(text) {
    // simple CSV parser supporting quoted fields
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], next = text[i + 1];
      if (inQuotes) {
        if (c === '"' && next === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { field += c; }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') { row.push(field); field = ""; }
        else if (c === '\n' || c === '\r') {
          if (field.length || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
        } else { field += c; }
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(reader.result);
      if (rows.length < 2) return;
      const header = rows[0].map(h => h.trim());
      const idx = name => header.indexOf(name);

      const laborers = getLaborers();
      const transactions = getTransactions();

      rows.slice(1).forEach(r => {
        if (!r[idx("RecordType")]) return;
        const type = r[idx("RecordType")];
        if (type === "Laborer") {
          const code = r[idx("Code")];
          const name = r[idx("Name")];
          if (!code) return;
          const existing = laborers.find(l => l.code.toLowerCase() === code.toLowerCase());
          if (existing) existing.name = name || existing.name;
          else laborers.push({ code, name: name || code });
        } else if (type === "Transaction") {
          const code = r[idx("Code")];
          const date = r[idx("Date")];
          const entryType = r[idx("Type")];
          const description = r[idx("Description")];
          const amount = parseFloat(r[idx("Amount")]);
          if (!code || isNaN(amount)) return;
          transactions.push({
            id: "t_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            code, date, type: entryType, description, amount
          });
        }
      });

      saveLaborers(laborers);
      saveTransactions(transactions);
      alert("Import complete.");
      renderDashboard();
    };
    reader.readAsText(file);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return { renderDashboard, renderDetails, initAddEntry };
})();
