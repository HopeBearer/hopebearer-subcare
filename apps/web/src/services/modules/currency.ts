
import { api } from '@/lib/api';

export interface Currency {
    code: string;
    name: string; // If we enrich this later, for now backend usually returns array of strings, need to verify
}

export const currencyService = {
    /**
     * Get list of supported currencies
     */
    getCurrencies: async () => {
        const response = await api.get<{ data: string[] }>('/currencies') as unknown as { data: string[] };
        return response.data || [];
    },

    /**
     * Convert currency
     */
    convert: async (amount: number, from: string, to: string) => {
        const response = await api.get('/currency/convert', {
            params: { amount, from, to }
        });
        return response.data;
    }
};
