import type { Customer } from '@/types/budget';

const STORAGE_KEY = 'bemec_customers';

// Mock initial customers
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    name: 'Desarrolladora Monteverdi',
    attention: 'Ing. Carlos Pérez',
    email: 'cperez@monteverdi.com.ar',
    phone: '+54 261 555-1234',
    cuit: '30-71234567-8',
    address: 'Av. San Martín 1250',
    locality: 'Mendoza',
    province: 'Mendoza',
    notes: 'Cliente frecuente - prioridad alta',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Bodega Los Andes S.A.',
    attention: 'Martín Rodríguez',
    email: 'mantenimiento@bodegalosandes.com',
    phone: '+54 261 555-5678',
    cuit: '30-65432198-7',
    address: 'Ruta 40 Km 25',
    locality: 'Luján de Cuyo',
    province: 'Mendoza',
    notes: '',
    createdAt: '2024-02-20T14:30:00Z',
    updatedAt: '2024-02-20T14:30:00Z',
  },
  {
    id: '3',
    name: 'Agrícola del Valle',
    attention: 'Roberto Fernández',
    email: 'rfernandez@agricoladelvalle.com',
    phone: '+54 261 555-9012',
    cuit: '20-25678901-4',
    address: 'Calle Las Heras 456',
    locality: 'San Rafael',
    province: 'Mendoza',
    notes: 'Contactar siempre por WhatsApp',
    createdAt: '2024-03-10T09:15:00Z',
    updatedAt: '2024-03-10T09:15:00Z',
  },
];

/**
 * Initialize storage with mock data if empty
 */
function initializeStorage(): void {
  if (typeof window === 'undefined') return;
  
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_CUSTOMERS));
  }
}

/**
 * Get all customers from storage
 */
export function getAllCustomers(): Customer[] {
  if (typeof window === 'undefined') return MOCK_CUSTOMERS;
  
  initializeStorage();
  
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  
  try {
    return JSON.parse(data) as Customer[];
  } catch {
    return [];
  }
}

/**
 * Get a customer by ID
 */
export function getCustomerById(id: string): Customer | undefined {
  const customers = getAllCustomers();
  return customers.find(c => c.id === id);
}

/**
 * Search customers by name, email, or cuit
 */
export function searchCustomers(query: string): Customer[] {
  if (!query.trim()) return getAllCustomers();
  
  const customers = getAllCustomers();
  const lowerQuery = query.toLowerCase();
  
  return customers.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) ||
    c.email?.toLowerCase().includes(lowerQuery) ||
    c.cuit?.toLowerCase().includes(lowerQuery) ||
    c.attention?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Save a new customer
 */
export function saveCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer {
  const customers = getAllCustomers();
  
  const newCustomer: Customer = {
    ...customer,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  customers.push(newCustomer);
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  }
  
  return newCustomer;
}

/**
 * Update an existing customer
 */
export function updateCustomer(id: string, updates: Partial<Customer>): Customer | undefined {
  const customers = getAllCustomers();
  const index = customers.findIndex(c => c.id === id);
  
  if (index === -1) return undefined;
  
  const updatedCustomer: Customer = {
    ...customers[index],
    ...updates,
    id, // Ensure ID doesn't change
    createdAt: customers[index].createdAt, // Preserve creation date
    updatedAt: new Date().toISOString(),
  };
  
  customers[index] = updatedCustomer;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  }
  
  return updatedCustomer;
}

/**
 * Delete a customer
 */
export function deleteCustomer(id: string): boolean {
  const customers = getAllCustomers();
  const filtered = customers.filter(c => c.id !== id);
  
  if (filtered.length === customers.length) return false;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  
  return true;
}

/**
 * Reset storage to mock data
 */
export function resetToMockData(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_CUSTOMERS));
  }
}
