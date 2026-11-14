// ============================================================================
// Mizan (ميزان) - Central Bank of the UAE (CBUAE) Exchange Rates Engine
// Statutory Framework: Article 69 of the UAE VAT Executive Regulations
// Non-AED invoices must be converted using the official CBUAE rate for invoice date
// ============================================================================

export interface CbUaeRate {
  currencyCode: string;
  currencyNameEn: string;
  currencyNameAr: string;
  rateToAED: number;
}

export const CBUAE_OFFICIAL_RATES: Record<string, CbUaeRate> = {
  AED: {
    currencyCode: 'AED',
    currencyNameEn: 'UAE Dirham',
    currencyNameAr: 'درهم إماراتي',
    rateToAED: 1.0,
  },
  USD: {
    currencyCode: 'USD',
    currencyNameEn: 'US Dollar',
    currencyNameAr: 'دولار أمريكي',
    rateToAED: 3.6725,
  },
  EUR: {
    currencyCode: 'EUR',
    currencyNameEn: 'Euro',
    currencyNameAr: 'يورو',
    rateToAED: 3.9821,
  },
  GBP: {
    currencyCode: 'GBP',
    currencyNameEn: 'British Pound',
    currencyNameAr: 'جنيه إسترليني',
    rateToAED: 4.654,
  },
  SAR: {
    currencyCode: 'SAR',
    currencyNameEn: 'Saudi Riyal',
    currencyNameAr: 'ريال سعودي',
    rateToAED: 0.979,
  },
  QAR: {
    currencyCode: 'QAR',
    currencyNameEn: 'Qatari Riyal',
    currencyNameAr: 'ريال قطري',
    rateToAED: 1.0089,
  },
  KWD: {
    currencyCode: 'KWD',
    currencyNameEn: 'Kuwaiti Dinar',
    currencyNameAr: 'دينار كويتي',
    rateToAED: 11.972,
  },
  BHD: {
    currencyCode: 'BHD',
    currencyNameEn: 'Bahraini Dinar',
    currencyNameAr: 'دينار بحريني',
    rateToAED: 9.741,
  },
  OMR: {
    currencyCode: 'OMR',
    currencyNameEn: 'Omani Rial',
    currencyNameAr: 'ريال عماني',
    rateToAED: 9.539,
  },
  INR: {
    currencyCode: 'INR',
    currencyNameEn: 'Indian Rupee',
    currencyNameAr: 'روبية هندية',
    rateToAED: 0.0435,
  },
  CAD: {
    currencyCode: 'CAD',
    currencyNameEn: 'Canadian Dollar',
    currencyNameAr: 'دولار كندي',
    rateToAED: 2.712,
  },
  AUD: {
    currencyCode: 'AUD',
    currencyNameEn: 'Australian Dollar',
    currencyNameAr: 'دولار أسترالي',
    rateToAED: 2.415,
  },
  CHF: {
    currencyCode: 'CHF',
    currencyNameEn: 'Swiss Franc',
    currencyNameAr: 'فرنك سويسري',
    rateToAED: 4.12,
  },
  CNY: {
    currencyCode: 'CNY',
    currencyNameEn: 'Chinese Yuan',
    currencyNameAr: 'يوان صيني',
    rateToAED: 0.512,
  },
  JPY: {
    currencyCode: 'JPY',
    currencyNameEn: 'Japanese Yen',
    currencyNameAr: 'ين ياباني',
    rateToAED: 0.0245,
  },
};

export class CbUaeRatesService {
  /**
   * Retrieves the official CBUAE exchange rate for a currency code.
   */
  public static getRate(currencyCode: string): CbUaeRate {
    const code = currencyCode.toUpperCase();
    return (
      CBUAE_OFFICIAL_RATES[code] || {
        currencyCode: code,
        currencyNameEn: code,
        currencyNameAr: code,
        rateToAED: 1.0,
      }
    );
  }

  /**
   * Converts a foreign currency amount to AED using the official CBUAE rate.
   */
  public static convertToAED(amount: number, currencyCode: string): number {
    const rate = this.getRate(currencyCode);
    return Math.round(amount * rate.rateToAED * 100) / 100;
  }
}
