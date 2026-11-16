export type WidgetId = 
    'overview' |
    'expense_summary' | 
    'predictive_insight' | 
    'recent_transactions';


export type ExpenseSummaryVariant = 'compact' | 'chart_screen_time';


export type WidgetConfig = 
  | {
      id: 'overview';
      visible: boolean;
      variant?: 'default';
    }
  | {
      id: 'expense_summary';
      visible: boolean;
      variant: ExpenseSummaryVariant;
    }
  | {
      id: 'predictive_insight';
      visible: boolean;
      variant?: 'compact' | 'detailed';
    }
  | {
      id: 'recent_transactions';
      visible: boolean;
      variant?: 'compact';
    };