export function formatCurrency(value: number, code: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(value);
}

export function getCurrencySymbol(code: string, locale: string): string {
  return (
    new Intl.NumberFormat(locale, { style: 'currency', currency: code })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? code
  );
}
