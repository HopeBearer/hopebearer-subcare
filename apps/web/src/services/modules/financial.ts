import { api } from '@/lib/api';
import { ApiResponse, FinancialOverviewDTO, PaymentRecordDTO } from '@subcare/types';

export const financialService = {
  getOverview: async (excludedIds: string[] = []): Promise<FinancialOverviewDTO> => {
    const params = new URLSearchParams();
    if (excludedIds.length > 0) {
      params.append('excludedIds', excludedIds.join(','));
    }
    const response = await api.get<any, ApiResponse<FinancialOverviewDTO>>('/finance/overview', {
      params
    });
    return response.data;
  },

  getHistory: async (page: number = 1, limit: number = 20): Promise<{ items: PaymentRecordDTO[], pagination: { total: number, page: number, limit: number, totalPages: number } }> => {
    const response = await api.get<any, ApiResponse<{ 
      items: PaymentRecordDTO[], 
      pagination: { total: number, page: number, limit: number, totalPages: number } 
    }>>('/finance/history', {
      params: { page, limit }
    });
    return response.data;
  },

  getPendingBills: async (): Promise<PaymentRecordDTO[]> => {
    const response = await api.get<any, ApiResponse<{ bills: PaymentRecordDTO[] }>>('/finance/pending');
    return response.data.bills;
  },

  confirmPayment: async (id: string, data?: { amount?: number, date?: Date }): Promise<PaymentRecordDTO> => {
    const response = await api.patch<any, ApiResponse<PaymentRecordDTO>>(`/finance/records/${id}/confirm`, data);
    return response.data;
  },

  cancelRenewal: async (id: string): Promise<PaymentRecordDTO> => {
    const response = await api.post<any, ApiResponse<PaymentRecordDTO>>(`/finance/records/${id}/cancel`);
    return response.data;
  },

  previewConversion: async (amount: number, from: string, to: string): Promise<{ amount: number, currency: string }> => {
    const response = await api.get<any, ApiResponse<{ amount: number, currency: string }>>('/currency/preview-convert', {
      params: { amount, from, to }
    });
    return response.data;
  }
};
