import * as XLSX from 'xlsx';

export interface ParsedRow {
  [key: string]: any;
  __rowNumber: number;
}

export interface ParseResult {
  headers: string[];
  data: ParsedRow[];
  error?: string;
}

export function parseFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = new Uint8Array(e.target?.result as ArrayBuffer);
        
        let workbook: XLSX.WorkBook;
        
        // Detect file type and parse accordingly
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = new TextDecoder().decode(arrayBuffer);
          workbook = XLSX.read(text, { type: 'string' });
        } else {
          workbook = XLSX.read(arrayBuffer, { type: 'array' });
        }
        
        // Get first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON with header option
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        }) as any[][];
        
        if (jsonData.length === 0) {
          resolve({ headers: [], data: [], error: 'File appears to be empty' });
          return;
        }
        
        // Extract headers from first row and normalize them
        const rawHeaders = jsonData[0] as string[];
        const headers = rawHeaders.map(header => 
          String(header || '').trim().replace(/\s+/g, '_').toLowerCase()
        );
        
        // Process data rows
        const parsedData: ParsedRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every(cell => !cell && cell !== 0)) continue; // Skip empty rows
          
          const parsedRow: ParsedRow = { __rowNumber: i + 1 };
          
          headers.forEach((header, index) => {
            let value = row[index];
            
            // Clean and normalize values
            if (typeof value === 'string') {
              value = value.trim();
              
              // Try to parse numbers
              if (value && !isNaN(Number(value))) {
                const num = Number(value);
                if (Number.isInteger(num)) {
                  value = num;
                }
              }
              
              // Parse boolean-like values
              if (value.toLowerCase() === 'true') value = true;
              if (value.toLowerCase() === 'false') value = false;
              
              // Convert empty strings to null
              if (value === '') value = null;
            }
            
            parsedRow[header] = value;
          });
          
          parsedData.push(parsedRow);
        }
        
        resolve({ headers, data: parsedData });
        
      } catch (error) {
        console.error('Parse error:', error);
        resolve({ 
          headers: [], 
          data: [], 
          error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    };
    
    reader.onerror = () => {
      resolve({ headers: [], data: [], error: 'Failed to read file' });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const allowedExtensions = ['.csv', '.xls', '.xlsx'];
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  
  return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}