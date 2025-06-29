import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark' | 'system';

export interface Colors {
  primary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;
  buttonBackground: string;
  buttonText: string;
  headerBackground: string;
  mapBackground: string;
}

const lightColors: Colors = {
  primary: '#6200EE',
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  card: '#FFFFFF',
  accent: '#03DAC6',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  overlay: 'rgba(0, 0, 0, 0.5)',
  buttonBackground: '#6200EE',
  buttonText: '#FFFFFF',
  headerBackground: '#FFFFFF',
  mapBackground: '#F5F5F5',
};

const darkColors: Colors = {
  primary: '#BB86FC',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  border: '#333333',
  card: '#1E1E1E',
  accent: '#03DAC6',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#CF6679',
  overlay: 'rgba(0, 0, 0, 0.7)',
  buttonBackground: '#BB86FC',
  buttonText: '#000000',
  headerBackground: '#1E1E1E',
  mapBackground: '#1E1E1E',
};

interface ThemeContextType {
  theme: Theme;
  colors: Colors;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = 'geocam_theme_preference';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    saveThemePreference(theme);
  }, [theme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme as Theme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const saveThemePreference = async (themeToSave: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, themeToSave);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
