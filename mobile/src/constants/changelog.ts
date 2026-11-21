export interface ReleaseNote {
  version: string;
  date: string;
  title: {
    'pt-BR': string;
    'en-US': string;
  };
  highlights: {
    'pt-BR': string[];
    'en-US': string[];
  };
}

// Keep newest release first; the first item drives the What's New popup and Settings badge.
export const CHANGELOG: ReleaseNote[] = [
  {
    version: '1.1.0',
    date: '2026-11-21',
    title: {
      'pt-BR': 'Histórico de Versões e Novidades',
      'en-US': "Release History & What's New",
    },
    highlights: {
      'pt-BR': [
        'Resumo automático de novidades sempre que o app recebe uma atualização.',
        'Histórico completo de versões acessível em Configurações > Sobre.',
        'Indicador visual de atualizações não lidas.',
      ],
      'en-US': [
        'Automatic summary of new features whenever the app is updated.',
        'Full release history accessible under Settings > About.',
        'Visual badge indicator for unread updates.',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-11-15',
    title: {
      'pt-BR': 'Lançamento Inicial do Pilar',
      'en-US': 'Pilar Initial Release',
    },
    highlights: {
      'pt-BR': [
        'Arquitetura Offline-First com sincronização automática em nuvem.',
        'Dashboard modular com filtro mensal, gráficos e previsão de gastos.',
        'Bloqueio biométrico, modo privacidade e backup em XLSX, CSV e JSON.',
      ],
      'en-US': [
        'Offline-First architecture with automatic cloud synchronization.',
        'Modular dashboard with monthly filter, charts, and spending forecast.',
        'Biometric app lock, privacy mode, and XLSX, CSV, and JSON backups.',
      ],
    },
  },
];

export const LATEST_RELEASE_VERSION = CHANGELOG[0]?.version ?? '1.0.0';