
import { Request, Response } from 'express';
import { CurrencyService } from '../../services/CurrencyService';
import { StatusCodes } from 'http-status-codes';
import { BusinessCode } from '../../constants/BusinessCode';

export class CurrencyController {
    constructor(private currencyService: CurrencyService) { }

    /**
     * Get supported currencies and their rates
     */
    getRates = async (req: Request, res: Response) => {
        try {
            const currencies = await this.currencyService.getSupportedCurrencies();

            res.status(StatusCodes.OK).json({
                status: 'success',
                code: BusinessCode.SUCCESS,
                data: currencies
            });
        } catch (error) {
            console.error('Failed to get currencies:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                code: BusinessCode.INTERNAL_ERROR,
                message: 'Failed to retrieve currencies'
            });
        }
    };

    /**
     * Convert currency
     * Query params: amount, from, to
     */
    convert = async (req: Request, res: Response) => {
        try {
            const { amount, from, to } = req.query;

            if (!amount || !from || !to) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    status: 'error',
                    code: BusinessCode.BAD_REQUEST,
                    message: 'Missing required parameters: amount, from, to'
                });
            }

            const result = await this.currencyService.convert(
                Number(amount),
                String(from),
                String(to)
            );

            res.status(StatusCodes.OK).json({
                status: 'success',
                code: BusinessCode.SUCCESS,
                data: {
                    amount: Number(amount),
                    from: String(from),
                    to: String(to),
                    result
                }
            });
        } catch (error) {
            console.error('Currency conversion failed:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                code: BusinessCode.INTERNAL_ERROR,
                message: 'Conversion failed'
            });
        }
    };
}
