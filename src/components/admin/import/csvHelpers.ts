// Shared CSV/date helpers for ImportPanel sub-components.

export const readFileUtf8 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let text = (reader.result as string) ?? '';
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      resolve(text);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });

export const parseCsvLine = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ';') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
};

export const parseDateFi = (val: string): string | null => {
  if (!val) return null;
  const s = val.trim();
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return s;
  return null;
};

// Parse Excel serial date or string date (supports dd.mm.yyyy, ISO, Excel serial).
export const parseDateAny = (val: string): string | null => {
  if (!val) return null;
  const fi = parseDateFi(val);
  if (fi) return fi;
  const num = Number(String(val).trim());
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
};
