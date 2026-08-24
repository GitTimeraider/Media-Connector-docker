import { createTheme } from '@mui/material/styles';

// Brand gradient: indigo -> violet. Keep these two in sync with any
// hardcoded gradients sprinkled through the page components.
export const brand = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  secondary: '#a855f7',
  secondaryDark: '#9333ea',
};

const glassCard = {
  backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: brand.primary,
      dark: brand.primaryDark,
    },
    secondary: {
      main: brand.secondary,
      dark: brand.secondaryDark,
    },
    background: {
      default: '#0a0a0f',
      paper: '#15151f',
    },
    success: { main: '#4ade80' },
    warning: { main: '#fbbf24' },
    error: { main: '#f87171' },
    info: { main: '#38bdf8' },
    divider: 'rgba(255,255,255,0.08)',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: -0.5 },
    h2: { fontWeight: 700, letterSpacing: -0.5 },
    h3: { fontWeight: 700, letterSpacing: -0.25 },
    h4: { fontWeight: 700, letterSpacing: -0.25 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0a0a0f',
          backgroundImage:
            'radial-gradient(circle at 15% 0%, rgba(99,102,241,0.10) 0%, transparent 45%), ' +
            'radial-gradient(circle at 85% 20%, rgba(168,85,247,0.08) 0%, transparent 45%)',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: glassCard,
      },
      defaultProps: {
        elevation: 1,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          ...glassCard,
          borderRadius: 16,
          transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
        },
        contained: {
          boxShadow: '0 4px 14px rgba(99,102,241,0.25)',
        },
        containedPrimary: {
          backgroundImage: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.secondary} 100%)`,
          '&:hover': {
            backgroundImage: `linear-gradient(135deg, ${brand.primaryDark} 0%, ${brand.secondaryDark} 100%)`,
            boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.03)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
          backgroundImage: `linear-gradient(90deg, ${brand.primary}, ${brand.secondary})`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          ...glassCard,
          borderRadius: 16,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: 'rgba(255,255,255,0.03)',
        },
        root: {
          borderColor: 'rgba(255,255,255,0.07)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.03)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 8,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(30,30,40,0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.75rem',
        },
      },
    },
  },
});

export default theme;
