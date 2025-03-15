import { Theme, ThemeOptions } from '@mui/material/styles'; // @mui/material version 5.13

/**
 * Enum defining the available theme modes
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark'
}

/**
 * Interface defining the configuration options for theme creation
 * This serves as a simplified API for configuring the theme throughout the application
 */
export interface ThemeConfig {
  /** The active theme mode (light or dark) */
  mode: ThemeMode;
  /** The primary color used across the application */
  primaryColor: string;
  /** The secondary color used across the application */
  secondaryColor: string;
  /** The font family used in typography */
  fontFamily: string;
  /** Global border radius size (in pixels) for components */
  borderRadius: number;
  /** Whether high contrast mode is enabled for accessibility */
  highContrastMode: boolean;
}

/**
 * Interface defining the structure of color options in the palette
 */
export interface PaletteColorOptions {
  /** Light variant of the color */
  light: string;
  /** Main color */
  main: string;
  /** Dark variant of the color */
  dark: string;
  /** Text color that provides sufficient contrast when used on top of the main color */
  contrastText: string;
}

/**
 * Interface defining custom palette options for the theme
 * Extends the standard Material UI palette with IMS-specific additions
 */
export interface CustomPaletteOptions {
  /** Primary color palette */
  primary: PaletteColorOptions;
  /** Secondary color palette */
  secondary: PaletteColorOptions;
  /** Error color palette */
  error: PaletteColorOptions;
  /** Warning color palette */
  warning: PaletteColorOptions;
  /** Info color palette */
  info: PaletteColorOptions;
  /** Success color palette */
  success: PaletteColorOptions;
  /** Background colors for different surfaces */
  background: {
    default: string;
    paper: string;
    darker: string;
    lighter: string;
  };
  /** Text colors for different contexts */
  text: {
    primary: string;
    secondary: string;
    disabled: string;
    hint: string;
  };
  /** Color for dividers */
  divider: string;
  /** Colors for interactive elements */
  action: {
    active: string;
    hover: string;
    selected: string;
    disabled: string;
    disabledBackground: string;
    focus: string;
  };
}

/**
 * Interface extending Material-UI ThemeOptions with custom properties for theme creation
 */
export interface CustomThemeOptions extends Omit<ThemeOptions, 'palette'> {
  /** Custom palette options */
  palette: CustomPaletteOptions;
  /** Typography options */
  typography?: {
    fontFamily: string;
    fontSize: number;
    fontWeightLight: number;
    fontWeightRegular: number;
    fontWeightMedium: number;
    fontWeightBold: number;
    h1: object;
    h2: object;
    h3: object;
    h4: object;
    h5: object;
    h6: object;
    subtitle1: object;
    subtitle2: object;
    body1: object;
    body2: object;
    button: object;
    caption: object;
    overline: object;
  };
  /** Spacing function or options */
  spacing?: ((factor: number) => number) | number;
  /** Breakpoint options for responsive design */
  breakpoints?: {
    values: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  };
  /** Shape options for components */
  shape?: {
    borderRadius: number;
  };
  /** Shadow definitions */
  shadows?: string[];
  /** Transition options */
  transitions?: {
    easing: {
      easeInOut: string;
      easeOut: string;
      easeIn: string;
      sharp: string;
    };
    duration: {
      shortest: number;
      shorter: number;
      short: number;
      standard: number;
      complex: number;
      enteringScreen: number;
      leavingScreen: number;
    };
  };
  /** Z-index values for layering */
  zIndex?: {
    mobileStepper: number;
    speedDial: number;
    appBar: number;
    drawer: number;
    modal: number;
    snackbar: number;
    tooltip: number;
  };
  /** Component style overrides */
  components?: {
    [key: string]: {
      styleOverrides?: {
        root?: object;
        [key: string]: object | undefined;
      };
      variants?: Array<{
        props: { [key: string]: any };
        style: object;
      }>;
      defaultProps?: object;
    };
  };
}

/**
 * Interface extending Material-UI Theme with custom properties for the IMS application
 */
export interface CustomTheme extends Omit<Theme, 'palette'> {
  /** Custom palette with IMS-specific colors */
  palette: {
    mode: 'light' | 'dark';
    primary: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    secondary: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    error: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    warning: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    info: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    success: {
      light: string;
      main: string;
      dark: string;
      contrastText: string;
    };
    background: {
      default: string;
      paper: string;
      darker: string;
      lighter: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      hint: string;
    };
    divider: string;
    action: {
      active: string;
      hover: string;
      selected: string;
      disabled: string;
      disabledBackground: string;
      focus: string;
    };
  };
  /** Typography settings */
  typography: Theme['typography'];
  /** Spacing function */
  spacing: Theme['spacing'];
  /** Responsive breakpoints */
  breakpoints: Theme['breakpoints'];
  /** Shape settings */
  shape: Theme['shape'];
  /** Shadow definitions */
  shadows: Theme['shadows'];
  /** Transition settings */
  transitions: Theme['transitions'];
  /** Z-index layers */
  zIndex: Theme['zIndex'];
  /** Component style overrides */
  components: Theme['components'];
}

/**
 * Interface defining the shape of the theme context provided by ThemeContext
 */
export interface ThemeContextType {
  /** The current theme object */
  theme: CustomTheme;
  /** The current theme configuration */
  themeConfig: ThemeConfig;
  /** Function to update the theme configuration */
  setThemeConfig: (config: Partial<ThemeConfig>) => void;
  /** Function to toggle between light and dark mode */
  toggleThemeMode: () => void;
  /** Function to toggle high contrast mode for accessibility */
  toggleHighContrastMode: () => void;
}