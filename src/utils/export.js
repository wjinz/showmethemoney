export function jsonToCsv(items) {
  if (!items || items.length === 0) return "";
  const replacer = (key, value) => value === null ? '' : value;
  const header = Object.keys(items[0]);
  const csv = [
    header.join(','), // header query
    ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
  ].join('\r\n');
  return csv;
}

export function downloadFile(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportTransactions(tx) {
  if (tx.length === 0) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }
  const csv = jsonToCsv(tx);
  const date = new Date().toISOString().split('T')[0];
  downloadFile(csv, `family-budget-tx-${date}.csv`, 'text/csv;charset=utf-8;');
}
