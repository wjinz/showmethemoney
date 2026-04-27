export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  is_private: boolean;
}

export interface SosRequest {
  id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requester: 'me' | 'spouse';
  date: string;
}

export type ViewType = 'home' | 'private';
export type SheetType = 'none' | 'main' | 'scan' | 'sos';
