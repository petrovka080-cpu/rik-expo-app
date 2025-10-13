export type RequestRow = {
  id: number;
  object: string | null;
  code: string | null;
  name: string | null;
  qty: number | null;
  uom: string | null;
  status: 'На утверждении' | 'Утверждено' | 'Отклонено';
  approved?: boolean | null;
  moved?: boolean | null;
  created_at: string;
};

export type PurchaseRow = {
  id: number;
  po: string;
  request_id: number | null;
  date: string; // YYYY-MM-DD
  object: string | null;
  code: string | null;
  name: string | null;
  qty: number | null;
  uom: string | null;
  status: 'Новая' | 'В работе' | 'Закрыта';
  created_at: string;
};

