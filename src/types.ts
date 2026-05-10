export interface UserPermissions {
  cashier: boolean;
  cashierReturn: boolean;
  depositSale: boolean;
  depositReturn: boolean;
  depositPay: boolean;
  storeQuantities: boolean;
  itemCard: boolean;
  addItem: boolean;
  installmentsAdd: boolean;
  installmentsPay: boolean;
  installmentsLate: boolean;
  settings: boolean;
  reports: boolean;
}

export interface User {
  code: string; // 2-digit max
  name: string;
  role: 'admin' | 'user'; // Admin bypasses all checks
  password?: string;
  permissions: UserPermissions;
}

export type PaymentMethod = 'cash' | 'visa' | 'instapay' | 'vodafone_cash';
export type TransactionType = 'sale' | 'return' | 'deposit_sale' | 'deposit_return' | 'deposit_payment';

export interface Product {
  id: string;
  category?: string;
  name: string;
  price: number;
  costPrice?: number;
  stock: number;
  barcode?: string;
  deviceStatus?: string;
  storage?: string;
  ram?: string;
}

export interface CartItem extends Product {
  cartQuantity: number;
}

export interface Transaction {
  id: string;
  timestamp: string; // ISO string
  type: TransactionType;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  senderWalletLast4?: string;
  receiverWalletLast4?: string;
  returnInvoiceNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  pageNumber?: string;
  depositAmount?: number;
  isDelivered?: boolean;
}

export interface InstallmentPayment {
  id: string;
  dueDate: string;
  amount: number;
  paidDate?: string;
  paidAmount?: number;
  isPaid: boolean;
}

export interface InstallmentContract {
  id: string;
  customerNumber?: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  pageNumber?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  deviceName: string;
  purchasePrice: number;
  downPayment: number;
  interestRate: number; // Monthly percentage %
  months: number;
  monthlyPayment: number;
  totalAmount: number; // Total after interest
  startDate: string; // Starting date for installments
  payments: InstallmentPayment[];
  createdAt: string;
}
