export interface Product {
  id: string;
  uniqueId?: string | null;
  brand?: string | null;
  model?: string | null;
  capacity?: string | null;
  color?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  downPaymentAmount?: number | null;
  downPaymentPercent?: number | null;
  installment6Months?: number | null;
  installment10Months?: number | null;
  condition?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}
